import { useMemo } from 'react';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
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

/** Today's timeline and route, worked out from the same history as the outdoor time (refreshed with `sunlight`). */
export function useSunlightTimeline(sunlight: SunlightSnapshot): SunlightTimeline {
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const events = useSunlightStore(state => state.events);
  const samples = useSunlightStore(state => state.samples);
  const trail = useSunlightStore(state => state.trail);
  const pause = useSunlightStore(state => state.pause);
  const pauses = useSunlightStore(state => state.pauses);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const { today, now } = sunlight;

  return useMemo(() => {
    const indoor = getIndoorPlaces(places, outdoorPlaceIds);
    const stays = getPlaceStays(events, samples, indoor, Math.max(trackingSince, today.dayStart), now);
    const items = getSunlightTimeline({
      dayStart: today.dayStart,
      now,
      stretches: today.stretches,
      stays,
      pauses: getPausedRanges(pauses, pause),
    });
    const path = getSunlightPath({
      dayStart: today.dayStart,
      now,
      trail,
      samples,
      stays,
      places,
      stretches: today.stretches,
    });
    return { items, path };
  }, [places, outdoorPlaceIds, events, samples, trail, pause, pauses, trackingSince, today, now]);
}
