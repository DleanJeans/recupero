import { useMemo } from 'react';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { addLocalDays } from '../utils/sun-utils';
import {
  getPlaceStays,
  getSunlightPath,
  getSunlightTimeline,
  type SunlightPathSegment,
  type SunlightTimelineItem,
} from '../utils/sunlight-timeline-utils';
import { getIndoorPlaces, getPausedRanges } from '../utils/sunlight-utils';
import type { SunlightSnapshot } from './use-sunlight';

export interface SunlightTimeline {
  /** Today's places, sessions and pauses, newest first. */
  items: SunlightTimelineItem[];
  /** Today's route for the map. */
  path: SunlightPathSegment[];
}

/**
 * One day's timeline and route (today unless another day of the past week is picked), worked out from the same
 * history as the outdoor time and refreshed with `sunlight`.
 */
export function useSunlightTimeline(sunlight: SunlightSnapshot, dayStart?: number): SunlightTimeline {
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const events = useSunlightStore(state => state.events);
  const samples = useSunlightStore(state => state.samples);
  const trail = useSunlightStore(state => state.trail);
  const pause = useSunlightStore(state => state.pause);
  const pauses = useSunlightStore(state => state.pauses);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const { days, now } = sunlight;
  const day = days.find(candidate => candidate.dayStart === dayStart) ?? sunlight.today;

  return useMemo(() => {
    const isToday = day.dayStart === sunlight.today.dayStart;
    // A past day ends at midnight; nothing on it is still going.
    const end = isToday ? now : Math.min(now, addLocalDays(day.dayStart, 1));
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const stays = getPlaceStays(events, samples, indoor, Math.max(trackingSince, day.dayStart), end);
    const items = getSunlightTimeline({
      dayStart: day.dayStart,
      now: end,
      stretches: day.stretches,
      stays,
      pauses: getPausedRanges(pauses, pause),
    }).map(item => (isToday || item.kind === 'session' ? item : { ...item, ongoing: false }));
    const path = getSunlightPath({
      dayStart: day.dayStart,
      now: end,
      trail,
      samples,
      stays,
      places,
      stretches: day.stretches,
    });
    return { items, path };
  }, [places, outdoorPlaceIds, events, samples, trail, pause, pauses, trackingSince, day, sunlight.today, now]);
}
