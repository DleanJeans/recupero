import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { findPlaceAtPoint } from './geofence-utils';
import { hasBackgroundLocationPermission } from './reminder-geofencing';
import { waitForHydration } from './store-hydration';
import { syncSunlightNotification } from './sunlight-notification';
import { getIndoorPlaces, roundCoordinate, shouldRecordPreciseSample } from './sunlight-utils';

export const SUNLIGHT_PRECISE_TASK = 'recupero-sunlight-precise';

/** Same cut-off as the app-open check: a vaguer fix is a cell-tower guess. */
const MAX_ACCURACY_M = 100;
const SAMPLE_COORD_DECIMALS = 3;

async function handleLocations(locations: Location.LocationObject[]): Promise<void> {
  await waitForHydration(useSunlightStore);
  await waitForHydration(useCuesStore);
  const { enabled, preciseTracking, outdoorPlaceIds, radiusM, samples, addSample } = useSunlightStore.getState();
  if (!enabled || !preciseTracking) return;
  const places = useCuesStore.getState().places;
  const indoor = getIndoorPlaces(places, outdoorPlaceIds).map(place => ({ ...place, radiusM }));
  let recorded = false;
  for (const { coords, timestamp } of locations) {
    if (coords.accuracy != null && coords.accuracy > MAX_ACCURACY_M) continue;
    const place = findPlaceAtPoint(indoor, { lat: coords.latitude, lng: coords.longitude });
    const placeId = place?.id ?? null;
    const last = useSunlightStore.getState().samples.at(-1) ?? samples.at(-1);
    if (!shouldRecordPreciseSample(last, placeId, timestamp)) continue;
    addSample({
      ts: timestamp,
      placeId,
      lat: roundCoordinate(coords.latitude, SAMPLE_COORD_DECIMALS),
      lng: roundCoordinate(coords.longitude, SAMPLE_COORD_DECIMALS),
    });
    recorded = true;
  }
  if (recorded) syncSunlightNotification();
}

// Must be defined at module load (imported from index.ts) so Android can run it with the app closed.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(SUNLIGHT_PRECISE_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  try {
    await handleLocations(data.locations);
  } catch (taskError) {
    console.warn('Sunlight precise tracking failed', taskError);
  }
});

/** Starts or stops the every-second background location updates to match Sunlight's settings. */
export async function syncPreciseTracking(): Promise<void> {
  try {
    const { enabled, preciseTracking } = useSunlightStore.getState();
    const running = await Location.hasStartedLocationUpdatesAsync(SUNLIGHT_PRECISE_TASK).catch(() => false);
    const wanted = enabled && preciseTracking && (await hasBackgroundLocationPermission());
    if (!wanted) {
      if (running) await Location.stopLocationUpdatesAsync(SUNLIGHT_PRECISE_TASK);
      return;
    }
    if (running) return;
    await Location.startLocationUpdatesAsync(SUNLIGHT_PRECISE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'Sunlight: precise tracking',
        notificationBody: 'Following your position closely. Turn it off in the Sunlight sheet to save battery.',
      },
    });
  } catch (error) {
    console.warn('Sunlight precise tracking sync failed', error);
  }
}
