import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import type { Cue, SavedPlace } from '../types/cue';
import { presentReminderNotification } from './reminder-notifications';
import { getReminderGeofenceRegions, getRemindersForGeofenceEvent } from './reminder-utils';

export const REMINDER_GEOFENCE_TASK = 'recupero-reminder-geofence';

interface GeofenceTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

type PersistedStore = typeof useCuesStore | typeof useBehaviorStore;

/** The task can run headless (app closed), before the persisted stores have loaded. */
function waitForHydration(store: PersistedStore): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise(resolve => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
    if (store.persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
}

async function handleGeofenceEvent({ eventType, region }: GeofenceTaskData): Promise<void> {
  const placeId = region.identifier;
  if (!placeId) return;
  const direction = eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit';
  await Promise.all([waitForHydration(useCuesStore), waitForHydration(useBehaviorStore)]);

  const { cues, places, addActivityEvent } = useCuesStore.getState();
  if (!places.some(place => place.id === placeId)) return;
  addActivityEvent({ kind: direction, placeId });

  const behaviors = useBehaviorStore.getState().behaviors;
  for (const cue of getRemindersForGeofenceEvent(cues, placeId, direction)) {
    await presentReminderNotification(cue, places, behaviors);
  }
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

/** Registers geofences for every place an active reminder points at, or stops geofencing if there are none. */
export async function syncReminderGeofences(cues: Cue[], places: SavedPlace[]): Promise<void> {
  const regions = getReminderGeofenceRegions(cues, places);
  const running = await Location.hasStartedGeofencingAsync(REMINDER_GEOFENCE_TASK).catch(() => false);
  if (regions.length === 0 || !(await hasBackgroundLocationPermission())) {
    if (running) await Location.stopGeofencingAsync(REMINDER_GEOFENCE_TASK);
    return;
  }
  // Calling start again replaces the previous set of regions.
  await Location.startGeofencingAsync(REMINDER_GEOFENCE_TASK, regions);
}
