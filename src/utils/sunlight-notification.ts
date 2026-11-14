import { SunlightNotification } from '../../modules/sunlight-notification';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { startOfLocalDay } from './sun-utils';
import {
  calibrateWeather,
  getIndoorPlaces,
  getSunlightDay,
  getSunlightNotificationPlan,
  getSunlightPresence,
  getSunReferencePoint,
  subtractSunlightRanges,
} from './sunlight-utils';

let lastPlanKey: string | null = null;

/**
 * Shows the live "counting sunlight" notification while you're out in daylight and hides it otherwise.
 * Called after every arrive/leave event (also from the background geofence task), position check and
 * weather refresh. A no-op on builds without the native module.
 */
export function syncSunlightNotification(): void {
  if (!SunlightNotification) return;
  const { places } = useCuesStore.getState();
  const {
    enabled,
    liveNotification,
    outdoorPlaceIds,
    events,
    deletedRanges,
    samples,
    weather: rawWeather,
    luxCalibrations,
    eyeLevelFactors,
    trackingSince,
    goalMinutes,
  } = useSunlightStore.getState();
  const weather = calibrateWeather(rawWeather, luxCalibrations, eyeLevelFactors);
  const now = Date.now();
  let plan = null;
  if (enabled && liveNotification) {
    const presence = getSunlightPresence(events, samples, getIndoorPlaces(places, outdoorPlaceIds), trackingSince, now);
    const point = getSunReferencePoint(samples, places);
    const today = getSunlightDay(
      startOfLocalDay(now),
      subtractSunlightRanges(presence.ranges, deletedRanges),
      point,
      weather,
      now,
    );
    plan = getSunlightNotificationPlan(presence, today, goalMinutes, weather, now);
  }
  try {
    if (plan) {
      // Restart only when something other than the clock changed (the service counts up on its own).
      const key = JSON.stringify({ ...plan, snapshotAt: 0, luxMinutes: 0, minutes: 0 });
      if (key === lastPlanKey) return;
      lastPlanKey = key;
      SunlightNotification.start(JSON.stringify(plan));
    } else {
      if (lastPlanKey === '') return;
      lastPlanKey = '';
      SunlightNotification.stop();
    }
  } catch (error) {
    console.warn('Sunlight notification failed', error);
  }
}
