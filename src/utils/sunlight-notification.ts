import { SunlightNotification } from '../../modules/sunlight-notification';
import { useCuesStore } from '../store/cues-store';
import { useSettingsStore } from '../store/settings-store';
import { useSunlightStore } from '../store/sunlight-store';
import { startOfOperationalDay } from './sun-utils';
import { addStayGapRanges, backdateOngoingOutside, getPlaceStays } from './sunlight-timeline-utils';
import {
  calibrateWeather,
  getActivePause,
  getIndoorPlaces,
  getPausedRanges,
  getRunningManualSession,
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
    pause,
    pauses,
    samples,
    weather: rawWeather,
    luxCalibrations,
    eyeLevelFactors,
    manualSessions,
    trackingSince,
    goalMinutes,
  } = useSunlightStore.getState();
  const weather = calibrateWeather(rawWeather, luxCalibrations, eyeLevelFactors);
  const now = Date.now();
  let plan = null;
  // A manual session has its own light level, which the notification's weather curve doesn't know about.
  if (enabled && liveNotification && !getRunningManualSession(manualSessions, now)) {
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const stays = getPlaceStays(events, samples, indoor, trackingSince, now);
    const presence = backdateOngoingOutside(
      getSunlightPresence(events, samples, indoor, trackingSince, now),
      stays,
      now,
    );
    const point = getSunReferencePoint(samples, places);
    const today = getSunlightDay(
      startOfOperationalDay(now, useSettingsStore.getState().dayCutoffHour),
      subtractSunlightRanges(addStayGapRanges(presence.ranges, stays), [
        ...deletedRanges,
        ...getPausedRanges(pauses, pause),
      ]),
      point,
      weather,
      now,
      manualSessions,
    );
    plan = getSunlightNotificationPlan(
      presence,
      today,
      goalMinutes,
      weather,
      now,
      getActivePause(pause, now)?.pin ? undefined : getActivePause(pause, now)?.until,
    );
  }
  // Builds from before pausing existed would keep counting on their notification, so hide it there instead.
  if (plan?.pausedUntil != null && !SunlightNotification.supportsPause?.()) plan = null;
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
