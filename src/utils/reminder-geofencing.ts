import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useSettingsStore } from '../store/settings-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { Cue, SavedPlace } from '../types/cue';
import { toDateString } from './date-utils';
import { getPlaceTaskNotificationContent, getPlaceTasksForArrival } from './place-task-utils';
import { presentPlaceTaskNotification, presentReminderNotification } from './reminder-notifications';
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
import { getSunlightRegionPlaceId } from './sunlight-utils';

export const REMINDER_GEOFENCE_TASK = 'recupero-reminder-geofence';

/** Events this soon after registering are Android's initial "you're inside/outside" report, not movement. */
const INITIAL_TRIGGER_WINDOW_MS = 30_000;
let lastRegisteredAt = 0;

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
    if (Date.now() - lastRegisteredAt < INITIAL_TRIGGER_WINDOW_MS) return;
    await Promise.all([waitForHydration(useSunlightStore), waitForHydration(useCuesStore)]);
    // This may run in a separate background copy of the app; pick up what the other copy saved first.
    await rehydrateSunlight();
    useSunlightStore.getState().addEvent({ ts: Date.now(), kind: direction, placeId: sunlightPlaceId });
    // Leaving starts the live "counting sunlight" notification, arriving ends it (the geofence event lets
    // Android start its foreground service from the background).
    syncSunlightNotification();
    return;
  }
  await Promise.all([waitForHydration(useCuesStore), waitForHydration(useBehaviorStore)]);

  const { cues, places, addActivityEvent } = useCuesStore.getState();
  const place = places.find(candidate => candidate.id === placeId);
  if (!place) return;
  addActivityEvent({ kind: direction, placeId });
  if (direction === 'enter') await completePlaceTasksOnArrival(place);

  const behaviors = useBehaviorStore.getState().behaviors;
  for (const cue of getRemindersForGeofenceEvent(cues, placeId, direction)) {
    await presentReminderNotification(cue, places, behaviors);
  }
}

/** "Go to this location" tasks tick themselves off (and log their behaviour) on arrival. */
async function completePlaceTasksOnArrival(place: SavedPlace): Promise<void> {
  await waitForHydration(useSettingsStore);
  const { dayCutoffHour } = useSettingsStore.getState();
  const todayStr = toDateString(new Date(), dayCutoffHour);
  const { tasks, toggleTaskCompletion } = useBehaviorStore.getState();
  const arrived = getPlaceTasksForArrival(tasks, place.id, todayStr, dayCutoffHour);
  if (arrived.length === 0) return;
  for (const task of arrived) toggleTaskCompletion(task.id, todayStr);
  await presentPlaceTaskNotification(getPlaceTaskNotificationContent(arrived, place)).catch(error =>
    console.warn('Place task notification failed', error),
  );
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
  const regions = getReminderGeofenceRegions(cues, places, extraWatches, extraRegions);
  const running = await Location.hasStartedGeofencingAsync(REMINDER_GEOFENCE_TASK).catch(() => false);
  if (regions.length === 0 || !(await hasBackgroundLocationPermission())) {
    if (running) await Location.stopGeofencingAsync(REMINDER_GEOFENCE_TASK);
    return;
  }
  // Re-registering the same regions on every launch made Android re-send arrive/leave for all of them.
  if (running && (await getRegisteredRegionsKey()) === getRegionsKey(regions)) return;
  // Calling start again replaces the previous set of regions.
  lastRegisteredAt = Date.now();
  await Location.startGeofencingAsync(REMINDER_GEOFENCE_TASK, regions);
}
