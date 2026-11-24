import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useSettingsStore } from '../store/settings-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { Cue, SavedPlace } from '../types/cue';
import { toDateString } from './date-utils';
import {
  getPlaceTaskNotificationContent,
  getPlaceTasksDueByDwell,
  isOneOffPlaceKey,
  type PlaceArrivals,
  pruneStalePlaceArrivals,
} from './place-task-utils';
import {
  cancelDwellReminders,
  presentPlaceTaskNotification,
  presentReminderNotification,
  scheduleDwellReminder,
} from './reminder-notifications';
import {
  type GeofenceWatch,
  getReminderGeofenceRegions,
  getRemindersForGeofenceEvent,
  type ReminderGeofenceRegion,
} from './reminder-utils';
import { waitForHydration } from './store-hydration';
import { syncSunlightNotification } from './sunlight-notification';
import { noteSunlightTaskRun } from './sunlight-persist';
import { rehydrateSunlight } from './sunlight-sync';
import { getSunlightRegionPlaceId, SUNLIGHT_PIN_PLACE_ID } from './sunlight-utils';

export const REMINDER_GEOFENCE_TASK = 'recupero-reminder-geofence';

/** Events this soon after registering are Android's initial "you're inside/outside" report, not movement. */
const INITIAL_TRIGGER_WINDOW_MS = 30_000;
let lastRegisteredAt = 0;
const REGISTERED_AT_KEY = 'recupero-geofence-registered-at';

/** The background copy of the app that receives events is a fresh process, so the time is also saved. */
async function wasJustRegistered(now: number): Promise<boolean> {
  if (now - lastRegisteredAt < INITIAL_TRIGGER_WINDOW_MS) return true;
  try {
    const saved = Number(await AsyncStorage.getItem(REGISTERED_AT_KEY));
    return Number.isFinite(saved) && now - saved < INITIAL_TRIGGER_WINDOW_MS;
  } catch {
    return false;
  }
}

function getRegionsKey(regions: Array<Partial<Location.LocationRegion>>): string {
  return JSON.stringify(
    regions
      .map(region => [
        region.identifier,
        region.latitude,
        region.longitude,
        region.radius,
        region.notifyOnEnter,
        region.notifyOnExit,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

async function getRegisteredRegionsKey(): Promise<string | null> {
  try {
    const options = (await TaskManager.getTaskOptionsAsync(REMINDER_GEOFENCE_TASK)) as
      | { regions?: Array<Partial<Location.LocationRegion>> }
      | undefined;
    return options?.regions ? getRegionsKey(options.regions) : null;
  } catch {
    return null;
  }
}

interface GeofenceTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

async function handleGeofenceEvent({ eventType, region }: GeofenceTaskData): Promise<void> {
  const placeId = region.identifier;
  if (!placeId) return;
  const direction = eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit';
  const sunlightPlaceId = getSunlightRegionPlaceId(placeId);
  if (sunlightPlaceId) {
    void noteSunlightTaskRun('geofence', AppState.currentState);
    // Registering geofences makes Android report "inside"/"outside" for every region at once. With small
    // radii those are fuzzy (it said "arrived" at a shop while driving off), and the GPS check on app
    // open already knows where you are, so they aren't real arrivals or departures.
    if (await wasJustRegistered(Date.now())) return;
    await Promise.all([waitForHydration(useSunlightStore), waitForHydration(useCuesStore)]);
    // This may run in a separate background copy of the app; pick up what the other copy saved first.
    await rehydrateSunlight();
    if (sunlightPlaceId === SUNLIGHT_PIN_PLACE_ID) {
      // Leaving the pause pin resumes counting and removes the pin.
      if (direction === 'exit' && useSunlightStore.getState().pause?.pin) useSunlightStore.getState().resumeSunlight();
      syncSunlightNotification();
      return;
    }
    useSunlightStore.getState().addEvent({ ts: Date.now(), kind: direction, placeId: sunlightPlaceId });
    // Leaving starts the live "counting sunlight" notification, arriving ends it (the geofence event lets
    // Android start its foreground service from the background).
    syncSunlightNotification();
    return;
  }
  await Promise.all([waitForHydration(useCuesStore), waitForHydration(useBehaviorStore)]);

  const { cues, places, addActivityEvent } = useCuesStore.getState();
  const place = places.find(candidate => candidate.id === placeId);
  const isOneOff = isOneOffPlaceKey(placeId);
  if (!place && !isOneOff) return;
  // Android reports every place at once whenever the regions are re-registered, and "left" for places the
  // user never entered. Only trust an exit for a place we know the user was inside, and ignore repeats.
  const now = Date.now();
  const wasInside = (await readPlaceArrivals(now))[placeId] !== undefined;
  const initialReport = await wasJustRegistered(now);
  if (direction === 'exit' && !wasInside) return;
  if (direction === 'enter' && wasInside) return;
  await trackPlaceTaskStay(placeId, direction);
  // A task's own place has no reminders or activity log, only the task to tick off.
  if (initialReport || isOneOff) return;
  addActivityEvent({ kind: direction, placeId });

  const behaviors = useBehaviorStore.getState().behaviors;
  await waitForHydration(useSettingsStore);
  const { placeDwellMin } = useSettingsStore.getState();
  if (direction === 'exit') {
    // Left before the stay was over: the pending "enter" reminders no longer apply.
    await cancelDwellReminders(getRemindersForGeofenceEvent(cues, placeId, 'enter').map(cue => cue.id));
  }
  for (const cue of getRemindersForGeofenceEvent(cues, placeId, direction)) {
    if (direction === 'enter' && placeDwellMin > 0) await scheduleDwellReminder(cue, placeDwellMin, places, behaviors);
    else await presentReminderNotification(cue, places, behaviors);
  }
}

const PLACE_ARRIVALS_KEY = 'recupero-place-arrivals';

async function readPlaceArrivals(now: number): Promise<PlaceArrivals> {
  try {
    const raw = await AsyncStorage.getItem(PLACE_ARRIVALS_KEY);
    return pruneStalePlaceArrivals(raw ? (JSON.parse(raw) as PlaceArrivals) : {}, now);
  } catch {
    return {};
  }
}

/**
 * "Go to this location" tasks tick themselves off (and log their behaviour) once you have stayed at the place
 * for the task's duration, so walking around the neighbourhood doesn't count. Geofences only tell us about
 * enter/leave, so the stay is checked when you leave, on the next geofence event and when the app opens.
 */
export async function completeDuePlaceTasks(now = Date.now(), arrivals?: PlaceArrivals): Promise<void> {
  await Promise.all([
    waitForHydration(useBehaviorStore),
    waitForHydration(useCuesStore),
    waitForHydration(useSettingsStore),
  ]);
  const stays = arrivals ?? (await readPlaceArrivals(now));
  if (Object.keys(stays).length === 0) return;
  const { dayCutoffHour } = useSettingsStore.getState();
  const todayStr = toDateString(new Date(now), dayCutoffHour);
  const { tasks, toggleTaskCompletion } = useBehaviorStore.getState();
  const due = getPlaceTasksDueByDwell(tasks, stays, now, todayStr, dayCutoffHour);
  if (due.length === 0) return;
  const { places } = useCuesStore.getState();
  for (const task of due) toggleTaskCompletion(task.id, todayStr);
  for (const place of places) {
    const placeTasks = due.filter(task => task.placeId === place.id);
    if (placeTasks.length === 0) continue;
    await presentPlaceTaskNotification(getPlaceTaskNotificationContent(placeTasks, place)).catch(error =>
      console.warn('Place task notification failed', error),
    );
  }
  for (const task of due) {
    if (task.placeId || !task.oneOffPlace) continue;
    await presentPlaceTaskNotification(getPlaceTaskNotificationContent([task], task.oneOffPlace)).catch(error =>
      console.warn('Place task notification failed', error),
    );
  }
}

async function trackPlaceTaskStay(placeId: string, direction: 'enter' | 'exit'): Promise<void> {
  const now = Date.now();
  const arrivals = await readPlaceArrivals(now);
  if (direction === 'enter') {
    // A repeated enter (geofence jitter) must not restart the clock.
    const next = { ...arrivals, [placeId]: arrivals[placeId] ?? now };
    await AsyncStorage.setItem(PLACE_ARRIVALS_KEY, JSON.stringify(next));
    await completeDuePlaceTasks(now, next);
    return;
  }
  await completeDuePlaceTasks(now, arrivals);
  const { [placeId]: _left, ...remaining } = arrivals;
  await AsyncStorage.setItem(PLACE_ARRIVALS_KEY, JSON.stringify(remaining));
}

// Must be defined at module load (imported from index.ts) so Android can run it with the app closed.
TaskManager.defineTask<GeofenceTaskData>(REMINDER_GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  try {
    await handleGeofenceEvent(data);
  } catch (taskError) {
    console.warn('Reminder geofence task failed', taskError);
  }
});

export async function hasBackgroundLocationPermission(): Promise<boolean> {
  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  return foreground.granted && background.granted;
}

/** Foreground first (Android requires it), then "Allow all the time". */
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.granted;
}

/**
 * Registers geofences for every place an active reminder (or an extra watch, e.g. a place task) points at,
 * or stops geofencing if there are none.
 */
export async function syncReminderGeofences(
  cues: Cue[],
  places: SavedPlace[],
  extraWatches: GeofenceWatch[] = [],
  extraRegions: ReminderGeofenceRegion[] = [],
): Promise<void> {
  await waitForHydration(useSettingsStore);
  const { reminderRadiusM, placeDwellMin } = useSettingsStore.getState();
  const regions = getReminderGeofenceRegions(cues, places, extraWatches, extraRegions, {
    radiusM: reminderRadiusM,
    dwellMin: placeDwellMin,
  });
  const running = await Location.hasStartedGeofencingAsync(REMINDER_GEOFENCE_TASK).catch(() => false);
  if (regions.length === 0 || !(await hasBackgroundLocationPermission())) {
    if (running) await Location.stopGeofencingAsync(REMINDER_GEOFENCE_TASK);
    return;
  }
  // Re-registering the same regions on every launch made Android re-send arrive/leave for all of them.
  if (running && (await getRegisteredRegionsKey()) === getRegionsKey(regions)) return;
  // Calling start again replaces the previous set of regions.
  lastRegisteredAt = Date.now();
  await AsyncStorage.setItem(REGISTERED_AT_KEY, String(lastRegisteredAt)).catch(() => {});
  await Location.startGeofencingAsync(REMINDER_GEOFENCE_TASK, regions);
}
