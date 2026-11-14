import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { SunlightDay, SunlightRange, SunlightWeather } from '../types/sunlight';
import type { GeoPoint } from '../utils/geofence-utils';
import { hasBackgroundLocationPermission } from '../utils/reminder-geofencing';
import { addLocalDays, getSunTimes, startOfLocalDay } from '../utils/sun-utils';
import {
  calibrateWeather,
  getIndoorPlaces,
  getLuxAt,
  getSunlightDays,
  getSunlightPresence,
  getSunlightStatus,
  getSunReferencePoint,
  isOutNow,
  isSunUp,
  type SunlightStatus,
  subtractSunlightRanges,
} from '../utils/sunlight-utils';

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
  const deletedRanges = useSunlightStore(state => state.deletedRanges);
  const rawWeather = useSunlightStore(state => state.weather);
  const luxCalibration = useSunlightStore(state => state.luxCalibration);
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
    const weather = calibrateWeather(rawWeather, luxCalibration);
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const presence = getSunlightPresence(events, samples, indoor, trackingSince, now);
    const point = getSunReferencePoint(samples, places);
    const ranges = subtractSunlightRanges(presence.ranges, deletedRanges);
    const days = getSunlightDays(ranges, point, weather, now);
    const tomorrow = point ? getSunTimes(addLocalDays(startOfLocalDay(now), 1), point.lat, point.lng) : undefined;
    const status = getSunlightStatus(
      presence.insidePlaceIds,
      days[0],
      now,
      locationAllowed,
      id => places.find(place => place.id === id)?.name,
    );
    const sunUp = isSunUp(days[0], now);
    const luxNow = weather && sunUp ? getLuxAt(now, weather.hours) : undefined;
    const rawLuxNow = rawWeather && sunUp ? getLuxAt(now, rawWeather.hours) : undefined;
    return {
      enabled,
      goalMinutes,
      luxNow,
      rawLuxNow,
      luxCalibration,
      days,
      today: days[0],
      outNow: isOutNow(ranges, now),
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
    goalMinutes,
    locationAllowed,
    outdoorPlaceIds,
    places,
    samples,
    trackingSince,
    rawWeather,
    luxCalibration,
    tick,
  ]);
}
