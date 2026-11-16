import type { SavedPlace } from '../types/cue';
import type { SunlightPresenceSample, SunlightRange, SunlightStretch, SunlightTrailPoint } from '../types/sunlight';
import { distanceMeters, type GeoPoint } from './geofence-utils';
import {
  getPresenceEvents,
  MAX_OUTDOOR_STRETCH_MS,
  MIN_OUTDOOR_MS,
  type PlaceEvent,
  pruneTrail,
  roundCoordinate,
  subtractSunlightRanges,
} from './sunlight-utils';

const MS_PER_MINUTE = 60_000;

/** Outside Mode keeps a trail point once you've moved this far from the last one. */
export const TRAIL_STEP_M = 15;
/** Fixes vaguer than this would draw zig-zags, so the trail skips them. */
export const TRAIL_MAX_ACCURACY_M = 30;
/** About 1 m: plenty for a line on the map. */
export const TRAIL_COORD_DECIMALS = 5;
/** A coarse position check this close to a trail point adds nothing to the line. */
const SAMPLE_NEAR_TRAIL_MS = 2 * MS_PER_MINUTE;

/** Whether a new fix is worth adding to the Outside Mode trail (moved far enough since the last point). */
export function shouldRecordTrailPoint(
  last: SunlightTrailPoint | undefined,
  point: GeoPoint,
  accuracyM: number | null | undefined,
): boolean {
  if (accuracyM != null && accuracyM > TRAIL_MAX_ACCURACY_M) return false;
  if (!last) return true;
  return distanceMeters(last, point) >= TRAIL_STEP_M;
}

/** Appends trail points (rounded), keeping the trail in time order and within its size and age limits. */
export function addTrailPoints(trail: SunlightTrailPoint[], points: SunlightTrailPoint[]): SunlightTrailPoint[] {
  if (points.length === 0) return trail;
  const rounded = points.map(point => ({
    ts: point.ts,
    lat: roundCoordinate(point.lat, TRAIL_COORD_DECIMALS),
    lng: roundCoordinate(point.lng, TRAIL_COORD_DECIMALS),
  }));
  return pruneTrail([...trail, ...rounded].sort((a, b) => a.ts - b.ts));
}

/** A stretch of time at one indoor place. */
export interface SunlightPlaceStay extends SunlightRange {
  placeId: string;
  ongoing: boolean;
}

/**
 * Which indoor place you were at and when, from the same arrivals, departures and position checks that decide
 * the outdoor time. With two overlapping places, the one you arrived at last wins.
 */
export function getPlaceStays(
  activity: PlaceEvent[],
  samples: SunlightPresenceSample[],
  indoorPlaces: SavedPlace[],
  since: number,
  now: number,
): SunlightPlaceStay[] {
  const indoorIds = new Set(indoorPlaces.map(place => place.id));
  const stays: SunlightPlaceStay[] = [];
  let inside = null as string[] | null;
  let current = null as { placeId: string; start: number } | null;

  for (const event of getPresenceEvents(activity, samples, indoorIds)) {
    if (event.ts > now) break;
    if (event.kind === 'sample') {
      inside = event.placeId ? [event.placeId] : [];
    } else if (event.placeId) {
      const placeId = event.placeId;
      const others: string[] = (inside ?? []).filter((id: string) => id !== placeId);
      inside = event.kind === 'enter' ? [...others, placeId] : others;
    }
    const at: string | undefined = current && inside?.includes(current.placeId) ? current.placeId : inside?.at(-1);
    if (at === current?.placeId) continue;
    if (current) stays.push({ placeId: current.placeId, start: current.start, end: event.ts, ongoing: false });
    current = at ? { placeId: at, start: event.ts } : null;
  }
  if (current) stays.push({ placeId: current.placeId, start: current.start, end: now, ongoing: true });
  return stays.filter(stay => stay.end > since).map(stay => ({ ...stay, start: Math.max(stay.start, since) }));
}

export type SunlightTimelineItem =
  | (SunlightRange & { kind: 'session'; stretch: SunlightStretch; luxMinutes?: number })
  | (SunlightRange & { kind: 'place'; placeId: string; ongoing: boolean })
  | (SunlightRange & { kind: 'pause'; ongoing: boolean });

/** Light dose of one session: average light at your eyes × its minutes. */
export function getStretchLuxMinutes(stretch: SunlightStretch): number | undefined {
  if (stretch.eyeLux == null) return undefined;
  return (stretch.eyeLux * (stretch.end - stretch.start)) / MS_PER_MINUTE;
}

interface TimelineInput {
  dayStart: number;
  now: number;
  /** Today's counted sessions (detected and manual). */
  stretches: SunlightStretch[];
  stays: SunlightPlaceStay[];
  /** Every pause, past and running, with its planned end. */
  pauses: SunlightRange[];
}

function clipToDay<T extends SunlightRange>(item: T, dayStart: number, now: number): T | undefined {
  const start = Math.max(item.start, dayStart);
  const end = Math.min(item.end, now);
  return end > start ? { ...item, start, end } : undefined;
}

/**
 * Today as one timeline, newest first: your stays at places, the sessions outside that counted (with their light
 * dose) and the times you paused counting. Short in-and-out blips at a place are dropped.
 */
export function getSunlightTimeline({
  dayStart,
  now,
  stretches,
  stays,
  pauses,
}: TimelineInput): SunlightTimelineItem[] {
  const items: SunlightTimelineItem[] = stretches.map(stretch => ({
    kind: 'session',
    start: stretch.start,
    end: stretch.end,
    stretch,
    luxMinutes: getStretchLuxMinutes(stretch),
  }));

  for (const pause of pauses) {
    const clipped = clipToDay(pause, dayStart, now);
    if (clipped) items.push({ kind: 'pause', start: clipped.start, end: clipped.end, ongoing: pause.end > now });
  }

  // A session at a place (a balcony at home, a missed departure) splits the stay around it.
  const pieces: SunlightPlaceStay[] = [];
  for (const stay of stays) {
    const clipped = clipToDay(stay, dayStart, now);
    if (!clipped) continue;
    for (const piece of subtractSunlightRanges([clipped], stretches)) {
      pieces.push({ ...clipped, ...piece, ongoing: stay.ongoing && piece.end >= now });
    }
  }
  pieces.sort((a, b) => a.start - b.start);
  const merged: SunlightPlaceStay[] = [];
  for (const piece of pieces) {
    const last = merged.at(-1);
    // Leaving and coming back with nothing counted in between (a GPS blip, a deleted session) is one stay.
    const sessionBetween = last != null && stretches.some(s => s.start >= last.end && s.end <= piece.start);
    if (last && last.placeId === piece.placeId && !sessionBetween) {
      merged[merged.length - 1] = { ...last, end: Math.max(last.end, piece.end), ongoing: piece.ongoing };
    } else {
      merged.push(piece);
    }
  }
  for (const stay of merged) {
    if (!stay.ongoing && stay.end - stay.start < MIN_OUTDOOR_MS) continue;
    items.push({ kind: 'place', placeId: stay.placeId, start: stay.start, end: stay.end, ongoing: stay.ongoing });
  }

  return items.sort((a, b) => b.start - a.start || b.end - a.end);
}

export interface SunlightPathSegment {
  /** Whether this part of the route was counted as time outside. */
  counted: boolean;
  points: GeoPoint[];
}

interface PathInput {
  dayStart: number;
  now: number;
  trail: SunlightTrailPoint[];
  samples: SunlightPresenceSample[];
  stays: SunlightPlaceStay[];
  places: SavedPlace[];
  stretches: SunlightRange[];
}

/**
 * Today's route for the map: Outside Mode's fine trail, plus your places (while you were at them) and the coarse
 * position checks where there's no trail. Split into runs that counted as outside and runs that didn't.
 */
export function getSunlightPath({
  dayStart,
  now,
  trail,
  samples,
  stays,
  places,
  stretches,
}: PathInput): SunlightPathSegment[] {
  const inDay = (ts: number) => ts >= dayStart && ts <= now;
  const points: Array<GeoPoint & { ts: number }> = trail.filter(point => inDay(point.ts));
  const trailTimes = points.map(point => point.ts);
  const nearTrail = (ts: number) => trailTimes.some(time => Math.abs(time - ts) <= SAMPLE_NEAR_TRAIL_MS);
  for (const sample of samples) {
    if (sample.placeId != null || sample.lat == null || sample.lng == null || !inDay(sample.ts)) continue;
    if (!nearTrail(sample.ts)) points.push({ ts: sample.ts, lat: sample.lat, lng: sample.lng });
  }
  const placeById = new Map(places.map(place => [place.id, place]));
  for (const stay of stays) {
    const place = placeById.get(stay.placeId);
    const clipped = clipToDay(stay, dayStart, now);
    if (!place || !clipped) continue;
    points.push({ ts: clipped.start, lat: place.lat, lng: place.lng });
    points.push({ ts: clipped.end, lat: place.lat, lng: place.lng });
  }
  points.sort((a, b) => a.ts - b.ts);

  const segments: SunlightPathSegment[] = [];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (from.lat === to.lat && from.lng === to.lng) continue;
    const middle = (from.ts + to.ts) / 2;
    const counted = stretches.some(range => range.start <= middle && middle <= range.end);
    const last = segments.at(-1);
    const fromPoint = { lat: from.lat, lng: from.lng };
    const toPoint = { lat: to.lat, lng: to.lng };
    const lastPoint = last?.points.at(-1);
    if (last && last.counted === counted && lastPoint?.lat === from.lat && lastPoint.lng === from.lng) {
      last.points.push(toPoint);
    } else {
      segments.push({ counted, points: [fromPoint, toPoint] });
    }
  }
  return segments;
}

/** Every coordinate on the path, to fit the map around it. */
export function getPathCoordinates(segments: SunlightPathSegment[]): GeoPoint[] {
  return segments.flatMap(segment => segment.points);
}

/**
 * Outdoor ranges plus the time between leaving one place and arriving at another. Travel counts as outside even
 * when the position checks and geofence events missed it; anything already counted is left alone, and pauses,
 * deleted ranges, manual sessions and daylight are applied afterwards like for any other range.
 */
export function addStayGapRanges(ranges: SunlightRange[], stays: SunlightPlaceStay[]): SunlightRange[] {
  const sorted = [...stays].sort((a, b) => a.start - b.start);
  const added: SunlightRange[] = [];
  for (let index = 0; index + 1 < sorted.length; index++) {
    const from = sorted[index];
    const to = sorted[index + 1];
    // Leaving and coming back to the same place is a GPS blip, not a trip.
    if (from.ongoing || from.placeId === to.placeId) continue;
    const gap = { start: from.end, end: to.start };
    if (gap.end - gap.start < MIN_OUTDOOR_MS || gap.end - gap.start > MAX_OUTDOOR_STRETCH_MS) continue;
    for (const piece of subtractSunlightRanges([gap], ranges)) {
      if (piece.end - piece.start >= MIN_OUTDOOR_MS) added.push(piece);
    }
  }
  return added.length === 0 ? ranges : [...ranges, ...added].sort((a, b) => a.start - b.start);
}
