import { useEffect, useMemo, useState } from 'react';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import type { SunlightDay } from '../types/sunlight';
import { addLocalDays, getSunTimes, startOfLocalDay } from '../utils/sun-utils';
import {
  getIndoorPlaces,
  getOutdoorRanges,
  getSunlightDays,
  getSunReferencePoint,
  isOutNow,
} from '../utils/sunlight-utils';

const TICK_MS = 60_000;

export interface SunlightSnapshot {
  enabled: boolean;
  goalMinutes: number;
  /** Today first, then the six days before. */
  days: SunlightDay[];
  today: SunlightDay;
  outNow: boolean;
  tomorrowSunrise?: number;
  hasPlaces: boolean;
  now: number;
}

/** Today's (and the past week's) outdoor time while the sun was up, refreshed each minute. */
export function useSunlight(): SunlightSnapshot {
  const activity = useCuesStore(state => state.activity);
  const places = useCuesStore(state => state.places);
  const enabled = useSunlightStore(state => state.enabled);
  const goalMinutes = useSunlightStore(state => state.goalMinutes);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const samples = useSunlightStore(state => state.samples);
  const weather = useSunlightStore(state => state.weather);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setTick(value => value + 1), TICK_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  return useMemo(() => {
    const now = Date.now();
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const ranges = getOutdoorRanges(activity, samples, indoor, trackingSince, now);
    const point = getSunReferencePoint(samples, places);
    const days = getSunlightDays(ranges, point, weather, now);
    const tomorrow = point ? getSunTimes(addLocalDays(startOfLocalDay(now), 1), point.lat, point.lng) : undefined;
    return {
      enabled,
      goalMinutes,
      days,
      today: days[0],
      outNow: isOutNow(ranges, now),
      tomorrowSunrise: tomorrow?.sunrise,
      hasPlaces: indoor.length > 0,
      now,
    };
    // tick re-reads the clock each minute.
  }, [activity, enabled, goalMinutes, outdoorPlaceIds, places, samples, trackingSince, weather, tick]);
}
