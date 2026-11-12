import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
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
import { getSunlightRegionPlaceId } from './sunlight-utils';

export const REMINDER_GEOFENCE_TASK = 'recupero-reminder-geofence';

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
    await waitForHydration(useSunlightStore);
    useSunlightStore.getState().addEvent({ ts: Date.now(), kind: direction, placeId: sunlightPlaceId });
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
  // Calling start again replaces the previous set of regions.
  await Location.startGeofencingAsync(REMINDER_GEOFENCE_TASK, regions);
}
