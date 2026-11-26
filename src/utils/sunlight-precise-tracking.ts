import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { SunlightTrailPoint } from '../types/sunlight';
import { dismissOutsideModeNotification, presentOutsideModeNotification } from './outside-mode-notification';
import { hasBackgroundLocationPermission } from './reminder-geofencing';
import { waitForHydration } from './store-hydration';
import { syncSunlightNotification } from './sunlight-notification';
import { noteSunlightTaskRun } from './sunlight-persist';
import { rehydrateSunlight } from './sunlight-sync';
import { shouldRecordTrailPoint } from './sunlight-timeline-utils';
import {
  describeSunlightFix,
  getIndoorPlaces,
  isUsableSunlightFix,
  roundCoordinate,
  shouldRecordPreciseSample,
} from './sunlight-utils';

export const SUNLIGHT_PRECISE_TASK = 'recupero-sunlight-precise';

const SAMPLE_COORD_DECIMALS = 3;

async function handleLocations(locations: Location.LocationObject[]): Promise<void> {
  void noteSunlightTaskRun('precise', AppState.currentState);
  await waitForHydration(useSunlightStore);
  await waitForHydration(useCuesStore);
  const { enabled, preciseTracking, outdoorPlaceIds, samples } = useSunlightStore.getState();
  if (!enabled || !preciseTracking) return;
  const places = useCuesStore.getState().places;
  const indoor = getIndoorPlaces(places, outdoorPlaceIds);
  const describe = ({ coords }: Location.LocationObject) =>
    describeSunlightFix(indoor, { lat: coords.latitude, lng: coords.longitude }, coords.accuracy);
  const isNew = (location: Location.LocationObject) => {
    const fix = describe(location);
    if (!isUsableSunlightFix(fix, location.coords.accuracy)) return false;
    return shouldRecordPreciseSample(
      useSunlightStore.getState().samples.at(-1) ?? samples.at(-1),
      fix.placeId,
      location.timestamp,
    );
  };
  // The path on the map: every ~15 m you move while away from your places.
  const trailPoints = (lastPoint: SunlightTrailPoint | undefined) => {
    const points: SunlightTrailPoint[] = [];
    let last = lastPoint;
    for (const location of locations) {
      const point = { lat: location.coords.latitude, lng: location.coords.longitude };
      if (describe(location).placeId != null) continue;
      if (!shouldRecordTrailPoint(last, point, location.coords.accuracy)) continue;
      last = { ts: location.timestamp, ...point };
      points.push(last);
    }
    return points;
  };
  if (!locations.some(isNew) && trailPoints(useSunlightStore.getState().trail.at(-1)).length === 0) return;
  // Another copy of the app (a background geofence event) may have saved since; build on that.
  await rehydrateSunlight();
  useSunlightStore.getState().addTrailPoints(trailPoints(useSunlightStore.getState().trail.at(-1)));
  let recorded = false;
  for (const location of locations) {
    const { coords, timestamp } = location;
    const fix = describe(location);
    if (!isUsableSunlightFix(fix, coords.accuracy)) continue;
    const last = useSunlightStore.getState().samples.at(-1) ?? samples.at(-1);
    if (!shouldRecordPreciseSample(last, fix.placeId, timestamp)) continue;
    useSunlightStore.getState().addSample({
      ts: timestamp,
      ...fix,
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
      await dismissOutsideModeNotification();
      return;
    }
    if (running) return;
    await Location.startLocationUpdatesAsync(SUNLIGHT_PRECISE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'Sunlight: Outside Mode',
        notificationBody: 'Following you closely while you move between places.',
      },
    });
    await presentOutsideModeNotification();
  } catch (error) {
    console.warn('Sunlight precise tracking sync failed', error);
  }
}
