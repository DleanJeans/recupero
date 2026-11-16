import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import type {
  SunlightDay,
  SunlightManualSession,
  SunlightPause,
  SunlightRange,
  SunlightWeather,
} from '../types/sunlight';
import type { GeoPoint } from '../utils/geofence-utils';
import { hasBackgroundLocationPermission } from '../utils/reminder-geofencing';
import { addLocalDays, getSunTimes, startOfLocalDay } from '../utils/sun-utils';
import { addStayGapRanges, getPlaceStays } from '../utils/sunlight-timeline-utils';
import {
  calibrateWeather,
  formatLux,
  formatPauseUntil,
  getActivePause,
  getCalibrationFactorAt,
  getEyeLevelFactorAt,
  getIndoorPlaces,
  getLuxAt,
  getPausedRanges,
  getRunningManualSession,
  getSunlightDays,
  getSunlightPresence,
  getSunlightStatus,
  getSunReferencePoint,
  isOutNow,
  isSunUp,
  type SunlightStatus,
  subtractSunlightRanges,
} from '../utils/sunlight-utils';
import { formatTime } from '../utils/time-utils';

const TICK_MS = 60_000;

export interface SunlightSnapshot {
  enabled: boolean;
  goalMinutes: number;
  /** Today first, then the six days before. */
  days: SunlightDay[];
  today: SunlightDay;
  outNow: boolean;
  /** Whether the counter is running right now, and why not. */
  status: SunlightStatus;
  locationAllowed: boolean;
  tomorrowSunrise?: number;
  /** Every stretch out since tracking started, and where the sun is worked out from (for other days). */
  ranges: SunlightRange[];
  point?: GeoPoint;
  weather?: SunlightWeather;
  /** Estimated open-ground lux right now (calibrated), while the sun is up and the forecast covers this hour. */
  luxNow?: number;
  /** The same before calibration, to work out a new calibration from a meter reading. */
  rawLuxNow?: number;
  luxCalibration: number;
  /** Share of the light reaching your eyes right now. */
  eyeLevelFactor: number;
  /** When the current stretch outside began, even before it's long enough to count. */
  outSince?: number;
  /** The manual session running now, if any. */
  manualSession?: SunlightManualSession;
  /** Detection paused by hand and not yet resumed, if any. */
  pause?: SunlightPause;
  hasPlaces: boolean;
  now: number;
}

/** "Allow all the time" location, re-checked when Recupero comes back to the foreground. */
function useBackgroundLocationAllowed(): boolean {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    let active = true;
    const check = () =>
      hasBackgroundLocationPermission()
        .then(result => active && setAllowed(result))
        .catch(() => undefined);
    check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return allowed;
}

/** Today's (and the past week's) outdoor time while the sun was up, refreshed each minute. */
export function useSunlight(): SunlightSnapshot {
  const places = useCuesStore(state => state.places);
  const enabled = useSunlightStore(state => state.enabled);
  const goalMinutes = useSunlightStore(state => state.goalMinutes);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const events = useSunlightStore(state => state.events);
  const samples = useSunlightStore(state => state.samples);
  const manualSessions = useSunlightStore(state => state.manualSessions);
  const deletedRanges = useSunlightStore(state => state.deletedRanges);
  const pause = useSunlightStore(state => state.pause);
  const pauses = useSunlightStore(state => state.pauses);
  const rawWeather = useSunlightStore(state => state.weather);
  const luxCalibrations = useSunlightStore(state => state.luxCalibrations);
  const eyeLevelFactors = useSunlightStore(state => state.eyeLevelFactors);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const locationAllowed = useBackgroundLocationAllowed();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setTick(value => value + 1), TICK_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  return useMemo(() => {
    const now = Date.now();
    const weather = calibrateWeather(rawWeather, luxCalibrations, eyeLevelFactors);
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const presence = getSunlightPresence(events, samples, indoor, trackingSince, now);
    const point = getSunReferencePoint(samples, places);
    const ranges = subtractSunlightRanges(
      addStayGapRanges(presence.ranges, getPlaceStays(events, samples, indoor, trackingSince, now)),
      [...deletedRanges, ...getPausedRanges(pauses, pause)],
    );
    const days = getSunlightDays(ranges, point, weather, now, undefined, manualSessions);
    const tomorrow = point ? getSunTimes(addLocalDays(startOfLocalDay(now), 1), point.lat, point.lng) : undefined;
    const manualSession = getRunningManualSession(manualSessions, now);
    const autoStatus = getSunlightStatus(
      presence.insidePlaceIds,
      days[0],
      now,
      locationAllowed,
      id => places.find(place => place.id === id)?.name,
    );
    const sunUp = isSunUp(days[0], now);
    const activePause = getActivePause(pause, now);
    // A session you started by hand outranks a pause; a pause outranks what the position says.
    const status: SunlightStatus =
      manualSession && sunUp
        ? {
            kind: 'counting',
            label: `Counting · manual session${manualSession.lux != null ? ` at ${formatLux(manualSession.lux)}` : ''}`,
          }
        : activePause
          ? { kind: 'paused', label: `Paused by you · ${formatPauseUntil(activePause.until, now, formatTime)}` }
          : autoStatus;
    const luxNow = weather && sunUp ? getLuxAt(now, weather.hours, weather.calibration) : undefined;
    const rawLuxNow = rawWeather && sunUp ? getLuxAt(now, rawWeather.hours) : undefined;
    return {
      enabled,
      goalMinutes,
      luxNow,
      rawLuxNow,
      luxCalibration: getCalibrationFactorAt(luxCalibrations, now),
      eyeLevelFactor: getEyeLevelFactorAt(eyeLevelFactors, now),
      days,
      today: days[0],
      outNow: isOutNow(ranges, now) || manualSession != null,
      manualSession,
      pause: activePause,
      outSince: presence.outSince,
      status,
      locationAllowed,
      tomorrowSunrise: tomorrow?.sunrise,
      ranges,
      point,
      weather,
      hasPlaces: indoor.length > 0,
      now,
    };
    // tick re-reads the clock each minute.
  }, [
    enabled,
    events,
    deletedRanges,
    pause,
    pauses,
    goalMinutes,
    locationAllowed,
    outdoorPlaceIds,
    places,
    samples,
    manualSessions,
    trackingSince,
    rawWeather,
    luxCalibrations,
    eyeLevelFactors,
    tick,
  ]);
}
