import type { SavedPlace } from '../types/cue';
import type {
  SunlightCalibrationStep,
  SunlightDay,
  SunlightGeofenceEvent,
  SunlightManualSession,
  SunlightPause,
  SunlightPresenceSample,
  SunlightRange,
  SunlightStretch,
  SunlightTrailPoint,
  SunlightWeather,
  SunlightWeatherHour,
} from '../types/sunlight';
import { distanceMeters, type GeoPoint } from './geofence-utils';
import type { ReminderGeofenceRegion } from './reminder-utils';
import { addLocalDays, getDaylightRange, getSunTimes, startOfLocalDay, startOfOperationalDay } from './sun-utils';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

export const DEFAULT_SUNLIGHT_GOAL_MINUTES = 30;
/** Small enough that a walk around the block counts. */
export const DEFAULT_SUNLIGHT_RADIUS_M = 10;
export const SUNLIGHT_GOAL_STEP_MINUTES = 5;
export const MIN_SUNLIGHT_GOAL_MINUTES = 5;
export const MAX_SUNLIGHT_GOAL_MINUTES = 240;
/** Trips out shorter than this are geofence flapping at the edge of a place, not time outside. */
export const MIN_OUTDOOR_MS = 2 * MS_PER_MINUTE;
/** With no event for this long, assume an arrival was missed and stop counting. */
export const MAX_OUTDOOR_STRETCH_MS = 8 * MS_PER_HOUR;
/** Two saved places at least this far apart can't be reached from one another without going outside. */
/** An exit no GPS check ever saw you away after, ended by a check back at the same place: only believed this long. */
export const MAX_UNCONFIRMED_OUT_MS = MS_PER_HOUR;
export const MIN_TRIP_DISTANCE_M = 100;
/** Clear-sky sunlight gives roughly 100-120 lux per W/m² of global horizontal irradiance. */
export const LUX_PER_WM2 = 120;
/** Below this, daylight is too dim to count as "bright" (heavy overcast, dusk). */
export const BRIGHT_LUX = 10_000;
/** You mostly look ahead or down, not at the sky, so your eyes get about half the light on open ground. */
export const EYE_LEVEL_LUX_FACTOR = 0.5;
export const MIN_EYE_LEVEL_FACTOR = 0.05;
export const MAX_EYE_LEVEL_FACTOR = 1;
/** The light dose goal is this lux at your eyes for every minute of the daily goal. */
export const LIGHT_DOSE_TARGET_LUX = 10_000;
export const DIM_LUX = 1_000;
export const SUNLIGHT_HISTORY_DAYS = 7;
export const WEATHER_REFRESH_MS = MS_PER_HOUR;
/** Rounded to about 1 km before leaving the phone. */
const WEATHER_COORD_DECIMALS = 2;

export interface PresenceEvent {
  ts: number;
  kind: 'enter' | 'exit' | 'sample';
  placeId: string | null;
}

/** Saved places that count as indoors: every place except the ones marked as outdoors (e.g. a park). */
export function getIndoorPlaces(places: SavedPlace[], outdoorPlaceIds: string[]): SavedPlace[] {
  const outdoor = new Set(outdoorPlaceIds);
  return places.filter(place => !outdoor.has(place.id));
}

export const SUNLIGHT_REGION_PREFIX = 'sunlight:';

/**
 * Sunlight's own geofence around every indoor place, at its own radius (reminders floor theirs to 100 m,
 * which would hide a walk around the block). Events land in the sunlight store, not the cue activity log.
 */
export function getSunlightGeofenceRegions(
  enabled: boolean,
  places: SavedPlace[],
  outdoorPlaceIds: string[],
  radiusM: number,
): ReminderGeofenceRegion[] {
  if (!enabled) return [];
  return getIndoorPlaces(places, outdoorPlaceIds).map(place => ({
    identifier: `${SUNLIGHT_REGION_PREFIX}${place.id}`,
    latitude: place.lat,
    longitude: place.lng,
    radius: radiusM,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
}

/** The place id behind a sunlight geofence identifier, or undefined for any other geofence. */
export function getSunlightRegionPlaceId(identifier: string): string | undefined {
  return identifier.startsWith(SUNLIGHT_REGION_PREFIX) ? identifier.slice(SUNLIGHT_REGION_PREFIX.length) : undefined;
}

/** Geofence id of the temporary pause pin (no saved place has this id). */
export const SUNLIGHT_PIN_PLACE_ID = 'pause-pin';

/** A pinned pause that never sees you leave still ends after this long. */
export const SUNLIGHT_PIN_MAX_MS = 12 * 60 * MS_PER_MINUTE;

/** The geofence around an active pause pin, so leaving it is noticed even with the app closed. */
export function getSunlightPinGeofenceRegions(
  pause: SunlightPause | undefined,
  radiusM: number,
  now: number,
): ReminderGeofenceRegion[] {
  const active = getActivePause(pause, now);
  if (!active?.pin) return [];
  return [
    {
      identifier: `${SUNLIGHT_REGION_PREFIX}${SUNLIGHT_PIN_PLACE_ID}`,
      latitude: active.pin.lat,
      longitude: active.pin.lng,
      radius: radiusM,
      notifyOnEnter: false,
      notifyOnExit: true,
    },
  ];
}

/** Whether a GPS fix has left a pause pin's radius (judged by the fix centre, so vague fixes can't end it early). */
export function hasLeftPausePin(
  pin: { lat: number; lng: number },
  point: GeoPoint,
  radiusM: number,
  accuracyM?: number | null,
): boolean {
  const distance = distanceMeters(pin, point);
  if (distance <= radiusM) return false;
  return accuracyM == null || accuracyM <= MAX_FIX_ACCURACY_M || distance > radiusM + accuracyM;
}

export type PlaceEvent = Pick<SunlightGeofenceEvent, 'ts'> & { kind: string; placeId?: string };

/** Geofence events this close together form one burst when they span this many places. */
const BURST_GAP_MS = 3_000;
const BURST_MIN_PLACES = 3;
/** A GPS fix this close past a place's edge could be indoor wobble, however accurate it claims to be. */
const MIN_WOBBLE_M = 15;
const MAX_WOBBLE_M = 50;

/**
 * Drops Android's "here's where you are" report for every region at once (sent whenever the geofences are
 * registered, e.g. each time the app starts): several places reported within a few seconds isn't movement.
 */
export function dropGeofenceBursts<T extends { ts: number; placeId?: string }>(events: T[]): T[] {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const kept: T[] = [];
  let group: T[] = [];
  const flush = () => {
    if (new Set(group.map(event => event.placeId)).size < BURST_MIN_PLACES) kept.push(...group);
    group = [];
  };
  for (const event of sorted) {
    if (group.length > 0 && event.ts - group[group.length - 1].ts > BURST_GAP_MS) flush();
    group.push(event);
  }
  flush();
  return kept;
}

/** An "away" fix just past a place's edge, within its own accuracy: likely GPS wobble indoors. */
export function isWobbleSample(sample: SunlightPresenceSample): boolean {
  if (sample.placeId != null || sample.edgeM == null) return false;
  const wobble = Math.min(MAX_WOBBLE_M, Math.max(MIN_WOBBLE_M, sample.accuracyM ?? 0));
  return sample.edgeM <= wobble;
}

export function getPresenceEvents(
  activity: PlaceEvent[],
  samples: SunlightPresenceSample[],
  indoorIds: Set<string>,
): PresenceEvent[] {
  const events: PresenceEvent[] = [];
  const placeEvents = activity.filter(
    event => (event.kind === 'enter' || event.kind === 'exit') && event.placeId && indoorIds.has(event.placeId),
  );
  for (const event of dropGeofenceBursts(placeEvents)) {
    events.push({ ts: event.ts, kind: event.kind as 'enter' | 'exit', placeId: event.placeId as string });
  }
  const sortedSamples = [...samples].sort((a, b) => a.ts - b.ts);
  sortedSamples.forEach((sample, index) => {
    const placeId = sample.placeId && indoorIds.has(sample.placeId) ? sample.placeId : null;
    // A borderline "away" fix the next check contradicts (back inside) was the GPS wobbling, not a trip out.
    const next = sortedSamples[index + 1];
    if (isWobbleSample(sample) && next?.placeId != null && indoorIds.has(next.placeId)) return;
    events.push({ ts: sample.ts, kind: 'sample', placeId });
  });
  return events.sort((a, b) => a.ts - b.ts);
}

/** Fixes vaguer than this are usually a cell-tower guess. */
export const MAX_FIX_ACCURACY_M = 100;

/**
 * Whether a fix is good enough to record: accurate, or vague but so far from every place that even its
 * accuracy circle can't reach one (the first fixes after leaving are often coarse; waiting for a sharp one
 * delayed noticing you'd left by minutes).
 */
export function isUsableSunlightFix(
  fix: Pick<SunlightPresenceSample, 'placeId' | 'edgeM'>,
  accuracyM?: number | null,
): boolean {
  if (accuracyM == null || accuracyM <= MAX_FIX_ACCURACY_M) return true;
  return fix.placeId == null && fix.edgeM != null && fix.edgeM > accuracyM;
}

/** Where a GPS fix is relative to the indoor places: inside one, or how far past the nearest one's edge. */
export function describeSunlightFix(
  indoor: Array<GeoPoint & { id: string; radiusM: number }>,
  point: GeoPoint,
  accuracyM: number | null | undefined,
): Pick<SunlightPresenceSample, 'placeId' | 'edgeM' | 'accuracyM'> {
  let inside: { id: string; distance: number } | undefined;
  let edge = Infinity;
  for (const place of indoor) {
    const distance = distanceMeters(place, point);
    if (distance <= place.radiusM) {
      if (!inside || distance < inside.distance) inside = { id: place.id, distance };
    } else edge = Math.min(edge, distance - place.radiusM);
  }
  const accuracy = accuracyM != null ? Math.round(accuracyM) : undefined;
  if (inside) return { placeId: inside.id, accuracyM: accuracy };
  return { placeId: null, edgeM: Number.isFinite(edge) ? Math.round(edge) : undefined, accuracyM: accuracy };
}

/**
 * Time away from every indoor place, from geofence arrive/leave events plus the app's own position checks.
 * Before the first event the state is unknown and nothing counts.
 */
export interface SunlightPresence {
  ranges: SunlightRange[];
  /** Indoor places you're in now; empty = out; null = not known yet (no event or check so far). */
  insidePlaceIds: string[] | null;
  /** When the current stretch out began (not yet clipped to sunrise or the 2-minute minimum), if out now. */
  outSince?: number;
}

export function getOutdoorRanges(
  activity: PlaceEvent[],
  samples: SunlightPresenceSample[],
  indoorPlaces: SavedPlace[],
  since: number,
  now: number,
): SunlightRange[] {
  return getSunlightPresence(activity, samples, indoorPlaces, since, now).ranges;
}

/** Where you are now (inside a place, out, or unknown) and every stretch out since `since`. */
export function getSunlightPresence(
  activity: PlaceEvent[],
  samples: SunlightPresenceSample[],
  indoorPlaces: SavedPlace[],
  since: number,
  now: number,
): SunlightPresence {
  const indoorIds = new Set(indoorPlaces.map(place => place.id));
  const placeById = new Map(indoorPlaces.map(place => [place.id, place]));
  const ranges: SunlightRange[] = [];
  let inside: Set<string> | null = null;
  let outSince: number | null = null;
  /** Last time something confirmed you were at one of the places in `inside` (a GPS check or an arrival). */
  let lastAt: number | null = null;
  /** Places the current stretch out began from, and whether any check actually found you away during it. */
  let leftFrom: Set<string> | null = null;
  let sawAway = false;

  /** A stretch still running counts from its first second; only one that ended is dropped when under 2 min. */
  const close = (end: number, ongoing = false) => {
    if (outSince == null) return;
    const capped = Math.min(end, outSince + MAX_OUTDOOR_STRETCH_MS);
    const start = Math.max(outSince, since);
    if (capped > start && (ongoing || capped - start >= MIN_OUTDOOR_MS)) ranges.push({ start, end: capped });
    outSince = null;
  };
  /** Whether getting from every one of `from` to `to` means going outside (they're not the same building). */
  const isTrip = (from: Set<string>, to: string) => {
    const target = placeById.get(to);
    if (!target || from.size === 0 || from.has(to)) return false;
    for (const id of from) {
      const place = placeById.get(id);
      if (!place || distanceMeters(place, target) < MIN_TRIP_DISTANCE_M) return false;
    }
    return true;
  };

  for (const event of getPresenceEvents(activity, samples, indoorIds)) {
    if (event.ts > now) break;
    const wasOut: boolean = inside != null && inside.size === 0;
    const wasInside: Set<string> | null = inside ? new Set(inside) : null;
    // Showing up at a far-away place with no departure seen (a missed exit) means you travelled in between:
    // count from the last time you were seen at the old place.
    if (
      !wasOut &&
      inside &&
      event.placeId &&
      event.kind !== 'exit' &&
      lastAt != null &&
      isTrip(inside, event.placeId)
    ) {
      outSince = lastAt;
      close(event.ts);
      inside = new Set();
    }
    if (event.kind === 'sample') {
      inside = new Set(event.placeId ? [event.placeId] : []);
    } else {
      // Leaving a place while the state is unknown most likely means you're now out.
      inside ??= new Set();
      if (event.kind === 'enter' && event.placeId) inside.add(event.placeId);
      else if (event.placeId) inside.delete(event.placeId);
    }
    const isOut = inside.size === 0;
    if (!isOut && event.placeId && event.kind !== 'exit') lastAt = event.ts;
    if (!wasOut && isOut) {
      outSince = event.ts;
      leftFrom = new Set(wasInside ?? []);
      if (event.kind === 'exit' && event.placeId) leftFrom.add(event.placeId);
      sawAway = event.kind === 'sample';
    } else if (wasOut && !isOut) {
      // Only a later check (no arrival event) put you back at the same place, and nothing ever saw you away:
      // the "exit" was a geofence misfire (e.g. GPS drift while asleep), not a trip.
      const falseExit =
        event.kind === 'sample' &&
        !sawAway &&
        outSince != null &&
        event.ts - outSince > MAX_UNCONFIRMED_OUT_MS &&
        leftFrom != null &&
        leftFrom.size > 0 &&
        [...inside].every(id => leftFrom?.has(id));
      if (falseExit) outSince = null;
      else close(event.ts);
    }
    // A check that finds you out after a long gap restarts the cap from here.
    else if (wasOut && isOut && event.kind === 'sample' && outSince != null) {
      sawAway = true;
      if (event.ts - outSince > MAX_OUTDOOR_STRETCH_MS) {
        close(event.ts);
        outSince = event.ts;
      }
    }
  }
  const currentOutSince = outSince ?? undefined;
  if (outSince != null) close(now, true);
  return {
    outSince: currentOutSince,
    ranges: ranges.filter(range => range.end > since),
    insidePlaceIds: inside == null ? null : [...(inside as Set<string>)],
  };
}

/** The ranges with the deleted ones cut out (a misfire the user removed). */
export function subtractSunlightRanges(ranges: SunlightRange[], deleted: SunlightRange[]): SunlightRange[] {
  if (deleted.length === 0) return ranges;
  let result = ranges;
  for (const cut of deleted) {
    result = result.flatMap(range => {
      if (cut.end <= range.start || cut.start >= range.end) return [range];
      const pieces: SunlightRange[] = [];
      if (cut.start > range.start) pieces.push({ start: range.start, end: cut.start });
      if (cut.end < range.end) pieces.push({ start: cut.end, end: range.end });
      return pieces;
    });
  }
  return result;
}

export interface SunlightPauseOption {
  label: string;
  /** Minutes to pause for; undefined means the rest of today. */
  minutes?: number;
}

/** Quick pauses for visiting somewhere that isn't a saved place. Every pause ends by itself. */
export const SUNLIGHT_PAUSE_OPTIONS: SunlightPauseOption[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: 'Rest of today' },
];

/** When a pause started `now` ends: after the chosen minutes, or at the end of the local day. */
export function getPauseUntil(option: SunlightPauseOption, now: number): number {
  return option.minutes != null ? now + option.minutes * MS_PER_MINUTE : addLocalDays(startOfLocalDay(now), 1);
}

/** The pause in effect right now, if any (one that has run out has resumed by itself). */
export function getActivePause(pause: SunlightPause | undefined, now: number): SunlightPause | undefined {
  return pause != null && pause.start <= now && now < pause.until ? pause : undefined;
}

/** Every stretch spent paused, past and current, to cut out of the outdoor time. */
export function getPausedRanges(pauses: SunlightRange[], pause: SunlightPause | undefined): SunlightRange[] {
  return pause ? [...pauses, { start: pause.start, end: pause.until }] : pauses;
}

/** "until 3:30 PM", or "until tomorrow" when it runs past midnight. */
export function formatPauseUntil(
  until: number,
  now: number,
  formatTime: (ts: number) => string,
  pinned = false,
): string {
  if (pinned) return 'until you leave';
  return until >= addLocalDays(startOfLocalDay(now), 1) ? 'until tomorrow' : `until ${formatTime(until)}`;
}

export function isOutNow(ranges: SunlightRange[], now: number): boolean {
  const last = ranges[ranges.length - 1];
  return last != null && last.end >= now;
}

function intersect(a: SunlightRange, b: SunlightRange): SunlightRange | undefined {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : undefined;
}

export function estimateLux(wm2: number): number {
  return Math.max(0, wm2) * LUX_PER_WM2;
}

const LUX_SAMPLE_MS = 5 * MS_PER_MINUTE;

/** Average estimated lux over a range, from the blended hourly curve (undefined if the weather doesn't cover it). */
export function getAverageLux(
  range: SunlightRange,
  hours: SunlightWeatherHour[],
  calibration?: SunlightCalibrationStep[],
): number | undefined {
  const length = range.end - range.start;
  if (length <= 0) return undefined;
  const count = Math.max(1, Math.ceil(length / LUX_SAMPLE_MS));
  const step = length / count;
  let total = 0;
  let covered = 0;
  for (let index = 0; index < count; index++) {
    const lux = getLuxAt(range.start + step * (index + 0.5), hours, calibration);
    if (lux == null) continue;
    total += lux;
    covered++;
  }
  return covered > 0 ? total / covered : undefined;
}

export interface SunlightLuxPoint {
  /** Middle of the slice. */
  ts: number;
  /** Estimated open-ground lux (calibrated); 0 outside daylight or where the weather isn't known. */
  lux: number;
  /** You were outside during this slice. */
  out: boolean;
}

/** Lux from sunrise to sunset in equal slices, marking the slices you spent outside. Empty if sun times or weather are missing. */
export function getLuxCurve(
  sunrise: number | undefined,
  sunset: number | undefined,
  hours: SunlightWeatherHour[],
  calibration: SunlightCalibrationStep[] | undefined,
  stretches: SunlightRange[],
  slices = 48,
): SunlightLuxPoint[] {
  if (sunrise == null || sunset == null || sunset <= sunrise || hours.length === 0) return [];
  const step = (sunset - sunrise) / slices;
  const points: SunlightLuxPoint[] = [];
  for (let index = 0; index < slices; index++) {
    const ts = sunrise + step * (index + 0.5);
    const lux = getLuxAt(ts, hours, calibration);
    points.push({
      ts,
      lux: lux ?? 0,
      out: stretches.some(stretch => stretch.start < ts && ts < stretch.end),
    });
  }
  return points.some(point => point.lux > 0) ? points : [];
}

/** The eye-level share of the light in effect at a moment: the latest step that started by then (50% before the first). */
export function getEyeLevelFactorAt(steps: SunlightCalibrationStep[] | undefined, ts: number): number {
  let factor = EYE_LEVEL_LUX_FACTOR;
  let latest = -Infinity;
  for (const step of steps ?? []) {
    if (step.from <= ts && step.from >= latest) {
      factor = step.factor;
      latest = step.from;
    }
  }
  return factor;
}

/** Light dose (lux·min at your eyes) over a range: the blended curve times the eye-level share in effect at each moment. */
export function getEyeLuxMinutes(
  range: SunlightRange,
  hours: SunlightWeatherHour[],
  calibration?: SunlightCalibrationStep[],
  eyeLevel?: SunlightCalibrationStep[],
): number {
  const length = range.end - range.start;
  if (length <= 0) return 0;
  const count = Math.max(1, Math.ceil(length / LUX_SAMPLE_MS));
  const step = length / count;
  let total = 0;
  let covered = 0;
  for (let index = 0; index < count; index++) {
    const ts = range.start + step * (index + 0.5);
    const lux = getLuxAt(ts, hours, calibration);
    if (lux == null) continue;
    total += lux * getEyeLevelFactorAt(eyeLevel, ts);
    covered++;
  }
  // Like the average lux, uncovered samples take the mean of the covered ones.
  return covered > 0 ? (total / covered) * (length / MS_PER_MINUTE) : 0;
}

/** Manual sessions as time ranges; a running one ends now, and none lasts longer than a forgotten stretch outside would. */
export function getManualRanges(
  sessions: SunlightManualSession[],
  now: number,
): Array<SunlightRange & { lux?: number; edited?: boolean }> {
  return sessions
    .filter(session => session.start <= now)
    .map(session => ({
      start: session.start,
      end: Math.min(session.end ?? now, now, session.start + MAX_OUTDOOR_STRETCH_MS),
      lux: session.lux,
      edited: session.edited,
    }))
    .filter(range => range.end > range.start);
}

/** The manual session running now, if any (not one that ran past the cap). */
export function getRunningManualSession(
  sessions: SunlightManualSession[],
  now: number,
): SunlightManualSession | undefined {
  return sessions.find(
    session => session.end == null && session.start <= now && now < session.start + MAX_OUTDOOR_STRETCH_MS,
  );
}

export const MANUAL_LUX_PRESETS = [1_000, 3_000, 5_000, 10_000, 20_000, 40_000];
export const DEFAULT_MANUAL_LUX = 5_000;
export const MAX_MANUAL_LUX = 150_000;

/** A typed lux level for a manual session, if it's a sensible number. */
export function getManualLuxFromText(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(MAX_MANUAL_LUX, Math.round(value));
}

/** Average lux over a range from its light dose (lux·min). */
function averageOverMinutes(luxMinutes: number, range: SunlightRange): number | undefined {
  const minutes = (range.end - range.start) / MS_PER_MINUTE;
  return minutes > 0 ? luxMinutes / minutes : undefined;
}

/** Outdoor time on one local day, counted only between sunrise and sunset there. */
export function getSunlightDay(
  dayStart: number,
  outdoorRanges: SunlightRange[],
  point: GeoPoint | undefined,
  weather: SunlightWeather | undefined,
  now: number,
  manualSessions: SunlightManualSession[] = [],
): SunlightDay {
  const sun = point ? getSunTimes(dayStart, point.lat, point.lng) : undefined;
  const daylight = point ? getDaylightRange(dayStart, point.lat, point.lng) : undefined;
  const stretches: SunlightStretch[] = [];
  const manualRanges = getManualRanges(manualSessions, now);
  let luxMinutes = 0;
  if (daylight) {
    // A manual session replaces whatever the position check would have counted over the same time.
    for (const range of subtractSunlightRanges(outdoorRanges, manualRanges)) {
      const overlap = intersect(range, daylight);
      if (!overlap) continue;
      const stretch: SunlightStretch = {
        ...overlap,
        lux: weather ? getAverageLux(overlap, weather.hours, weather.calibration) : undefined,
        ongoing: overlap.end >= now && range.end >= now,
      };
      if (stretch.lux != null) {
        const dose = getEyeLuxMinutes(stretch, weather?.hours ?? [], weather?.calibration, weather?.eyeLevel);
        luxMinutes += dose;
        stretch.eyeLux = averageOverMinutes(dose, overlap);
      }
      stretches.push(stretch);
    }
    for (const range of manualRanges) {
      const overlap = intersect(range, daylight);
      if (!overlap) continue;
      const session = manualSessions.find(candidate => candidate.start === range.start);
      const ongoing = session?.end == null && overlap.end >= now;
      const kind = range.edited ? { edited: true } : { manual: true };
      if (range.lux != null) {
        stretches.push({ ...overlap, lux: range.lux, eyeLux: range.lux, ongoing, ...kind });
        luxMinutes += (range.lux * (overlap.end - overlap.start)) / MS_PER_MINUTE;
      } else {
        // Edited times but not the light: estimate it from the weather like any detected session.
        const lux = weather ? getAverageLux(overlap, weather.hours, weather.calibration) : undefined;
        const dose =
          lux != null ? getEyeLuxMinutes(overlap, weather?.hours ?? [], weather?.calibration, weather?.eyeLevel) : 0;
        luxMinutes += dose;
        stretches.push({
          ...overlap,
          lux,
          eyeLux: lux != null ? averageOverMinutes(dose, overlap) : undefined,
          ongoing,
          ...kind,
        });
      }
    }
    stretches.sort((a, b) => a.start - b.start);
  }
  const totalMs = stretches.reduce((sum, stretch) => sum + stretch.end - stretch.start, 0);
  const luxStretches = stretches.filter(stretch => stretch.lux != null);
  const luxMs = luxStretches.reduce((sum, stretch) => sum + stretch.end - stretch.start, 0);
  const lux =
    luxMs > 0
      ? luxStretches.reduce((sum, stretch) => sum + (stretch.lux ?? 0) * (stretch.end - stretch.start), 0) / luxMs
      : undefined;
  return {
    dayStart,
    located: point != null,
    minutes: Math.floor(totalMs / MS_PER_MINUTE),
    stretches,
    sunrise: sun?.sunrise,
    sunset: sun?.sunset,
    polar: sun?.polar,
    lux,
    luxMinutes,
  };
}

/** Today first, then the days before it. */
export function getSunlightDays(
  outdoorRanges: SunlightRange[],
  point: GeoPoint | undefined,
  weather: SunlightWeather | undefined,
  now: number,
  count = SUNLIGHT_HISTORY_DAYS,
  manualSessions: SunlightManualSession[] = [],
  dayCutoffHour = 0,
): SunlightDay[] {
  const today = startOfOperationalDay(now, dayCutoffHour);
  return Array.from({ length: count }, (_, index) =>
    getSunlightDay(addLocalDays(today, -index), outdoorRanges, point, weather, now, manualSessions),
  );
}

/** Where to work out sunrise and sunset: the last checked position, else Home, else any saved place. */
export function getSunReferencePoint(samples: SunlightPresenceSample[], places: SavedPlace[]): GeoPoint | undefined {
  for (let index = samples.length - 1; index >= 0; index--) {
    const { lat, lng } = samples[index];
    if (lat != null && lng != null) return { lat, lng };
  }
  const place = places.find(candidate => candidate.isHome) ?? places[0];
  return place ? { lat: place.lat, lng: place.lng } : undefined;
}

export function roundCoordinate(value: number, decimals = WEATHER_COORD_DECIMALS): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function shouldRefreshWeather(weather: SunlightWeather | undefined, point: GeoPoint, now: number): boolean {
  if (!weather) return true;
  if (now - weather.fetchedAt >= WEATHER_REFRESH_MS) return true;
  // An older fetch may stop before the current hour (it used to end at midnight UTC).
  if (!weather.hours.some(hour => now > hour.ts - MS_PER_HOUR && now <= hour.ts)) return true;
  return weather.lat !== roundCoordinate(point.lat) || weather.lng !== roundCoordinate(point.lng);
}

/** Open-Meteo (free, no key): hourly shortwave radiation for the past week and today. */
export function getWeatherUrl(point: GeoPoint): string {
  const params = [
    `latitude=${roundCoordinate(point.lat)}`,
    `longitude=${roundCoordinate(point.lng)}`,
    'hourly=shortwave_radiation',
    `past_days=${SUNLIGHT_HISTORY_DAYS}`,
    // The response's days are UTC days, so 1 day would stop at 07:00 in Vietnam; 2 always covers "now".
    'forecast_days=2',
    'timeformat=unixtime',
  ];
  return `https://api.open-meteo.com/v1/forecast?${params.join('&')}`;
}

/** Hours from an Open-Meteo response. Radiation is the mean over the hour before each time. */
export function parseWeatherHours(json: unknown): SunlightWeatherHour[] {
  const hourly = (json as { hourly?: { time?: unknown; shortwave_radiation?: unknown } } | null)?.hourly;
  if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.shortwave_radiation)) return [];
  const values = hourly.shortwave_radiation;
  return hourly.time.flatMap((time, index) => {
    const wm2 = values[index];
    if (typeof time !== 'number' || typeof wm2 !== 'number' || !Number.isFinite(wm2)) return [];
    return [{ ts: time * 1000, wm2 }];
  });
}

export function formatSunlightMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatLux(lux: number): string {
  if (lux >= 1000) return `~${Math.round(lux / 1000)}k lux`;
  return `~${Math.round(lux / 50) * 50} lux`;
}

export type SunlightBrightness = 'bright' | 'overcast' | 'dim';

export function getSunlightBrightness(lux: number): SunlightBrightness {
  if (lux >= BRIGHT_LUX) return 'bright';
  if (lux >= DIM_LUX) return 'overcast';
  return 'dim';
}

/** When the sun next sets or rises, for the line under the Sunlight bar. */
export function getSunEventText(
  today: SunlightDay,
  now: number,
  formatTime: (ts: number) => string,
  tomorrowSunrise?: number,
): string | undefined {
  if (!today.located || today.polar === 'night') return undefined;
  if (today.polar === 'day') return 'sun up all day';
  if (today.sunrise != null && now < today.sunrise) return `sun rises at ${formatTime(today.sunrise)}`;
  if (today.sunset != null && now < today.sunset) return `sun sets at ${formatTime(today.sunset)}`;
  return tomorrowSunrise != null ? `rises at ${formatTime(tomorrowSunrise)}` : undefined;
}

export type SunlightStatusKind = 'counting' | 'indoors' | 'sunDown' | 'unknown' | 'off' | 'paused';

export interface SunlightStatus {
  kind: SunlightStatusKind;
  label: string;
}

export function isSunUp(day: SunlightDay, now: number): boolean {
  if (day.polar === 'day') return true;
  if (day.sunrise == null || day.sunset == null) return false;
  return now >= day.sunrise && now < day.sunset;
}

/** Whether the counter is running right now, and if not, why. */
export function getSunlightStatus(
  insidePlaceIds: string[] | null,
  today: SunlightDay,
  now: number,
  locationAllowed: boolean,
  getPlaceName: (placeId: string) => string | undefined,
): SunlightStatus {
  if (!locationAllowed) return { kind: 'off', label: 'Not tracking · location isn\'t "Allow all the time"' };
  if (!today.located) return { kind: 'unknown', label: 'Waiting · save a place first' };
  if (insidePlaceIds == null) return { kind: 'unknown', label: 'Waiting for the first time you leave a place' };
  const out = insidePlaceIds.length === 0;
  if (!isSunUp(today, now))
    return { kind: 'sunDown', label: out ? 'Paused · you’re out, but the sun is down' : 'Paused · sun is down' };
  if (!out) {
    const names = insidePlaceIds.map(getPlaceName).filter(Boolean);
    return { kind: 'indoors', label: `Paused · at ${names.length > 0 ? names.join(', ') : 'a saved place'}` };
  }
  return { kind: 'counting', label: 'Counting · you’re outside' };
}

/** About 400 m across: enough to see the radius around nearby places and a block or two. */
const SUNLIGHT_MAP_SPAN_M = 400;
const METERS_PER_DEGREE_LAT = 111_320;

export function getSunlightMapRegion(point: GeoPoint) {
  const latitudeDelta = SUNLIGHT_MAP_SPAN_M / METERS_PER_DEGREE_LAT;
  const cosLat = Math.max(0.01, Math.cos((point.lat * Math.PI) / 180));
  return { latitude: point.lat, longitude: point.lng, latitudeDelta, longitudeDelta: latitudeDelta / cosLat };
}

/**
 * Estimated open-ground lux at a moment. Each weather value is an hour's average, so it's placed at the middle
 * of its hour and the curve is blended linearly between hours (a flat hour overshoots early on a sunny morning).
 * Undefined outside the hours the weather covers.
 */
export function getLuxAt(
  ts: number,
  hours: SunlightWeatherHour[],
  calibration?: SunlightCalibrationStep[],
): number | undefined {
  const lux = getUncalibratedLuxAt(ts, hours);
  return lux == null ? undefined : lux * getCalibrationFactorAt(calibration, ts);
}

function getUncalibratedLuxAt(ts: number, hours: SunlightWeatherHour[]): number | undefined {
  if (hours.length === 0) return undefined;
  const sorted =
    hours.length > 1 && hours.some((hour, i) => i > 0 && hour.ts < hours[i - 1].ts)
      ? [...hours].sort((a, b) => a.ts - b.ts)
      : hours;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (ts <= first.ts - MS_PER_HOUR || ts > last.ts) return undefined;
  const half = MS_PER_HOUR / 2;
  if (ts <= first.ts - half) return estimateLux(first.wm2);
  if (ts >= last.ts - half) return estimateLux(last.wm2);
  for (let index = 1; index < sorted.length; index++) {
    const before = sorted[index - 1];
    const after = sorted[index];
    const from = before.ts - half;
    const to = after.ts - half;
    if (ts > to) continue;
    // A gap of more than an hour between values: don't blend across missing data.
    if (after.ts - before.ts > MS_PER_HOUR) return ts - from <= half ? estimateLux(before.wm2) : estimateLux(after.wm2);
    const t = (ts - from) / (to - from);
    return estimateLux(before.wm2 + (after.wm2 - before.wm2) * t);
  }
  return estimateLux(last.wm2);
}

export const MIN_LUX_CALIBRATION = 0.05;
export const MAX_LUX_CALIBRATION = 5;

const MAX_CALIBRATION_STEPS = 100;

/** The calibration in effect at a moment: the latest step that started by then (1 before the first). */
export function getCalibrationFactorAt(steps: SunlightCalibrationStep[] | undefined, ts: number): number {
  let factor = 1;
  let latest = -Infinity;
  for (const step of steps ?? []) {
    if (step.from <= ts && step.from >= latest) {
      factor = step.factor;
      latest = step.from;
    }
  }
  return factor;
}

/** The weather carrying your calibration history, so estimates use the factor in effect at each moment. */
export function calibrateWeather(
  weather: SunlightWeather | undefined,
  steps: SunlightCalibrationStep[],
  eyeLevel: SunlightCalibrationStep[] = [],
): SunlightWeather | undefined {
  if (!weather || (steps.length === 0 && eyeLevel.length === 0)) return weather;
  return { ...weather, calibration: steps, eyeLevel };
}

/** Adds a calibration from `from` onwards, replacing a step at the same moment and dropping the oldest past 100. */
export function addCalibrationStep(
  steps: SunlightCalibrationStep[],
  from: number,
  factor: number,
): SunlightCalibrationStep[] {
  return [...steps.filter(step => step.from !== from), { from, factor }]
    .sort((a, b) => a.from - b.from)
    .slice(-MAX_CALIBRATION_STEPS);
}

/** Calibration factor so the estimate now matches what a lux meter reads. */
export function getLuxCalibration(meterLux: number, estimatedLux: number): number | undefined {
  if (!(meterLux > 0) || !(estimatedLux > 0)) return undefined;
  return Math.min(MAX_LUX_CALIBRATION, Math.max(MIN_LUX_CALIBRATION, meterLux / estimatedLux));
}

export function getLightDoseTarget(goalMinutes: number): number {
  return LIGHT_DOSE_TARGET_LUX * goalMinutes;
}

/** Lux·min in a short form: 850, 42k, 1.2M. */
export function formatLuxMinutes(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

/** Light dose gained per minute right now: eye-level lux while counting, else nothing. */
export function getLightDoseRate(
  counting: boolean,
  luxNow: number | undefined,
  eyeFactor: number = EYE_LEVEL_LUX_FACTOR,
): number {
  return counting && luxNow != null ? luxNow * eyeFactor : 0;
}

/** The dose `at` a moment after the snapshot, growing at `ratePerMinute` (for the per-frame counter). */
export function getLiveLuxMinutes(luxMinutes: number, ratePerMinute: number, snapshotAt: number, at: number): number {
  return luxMinutes + (ratePerMinute * Math.max(0, at - snapshotAt)) / MS_PER_MINUTE;
}

const RATE_STEP_MS = 10 * MS_PER_MINUTE;

/** What the live notification needs; the Android service only adds elapsed time to it. */
export interface SunlightNotificationPlan {
  snapshotAt: number;
  luxMinutes: number;
  minutes: number;
  target: number;
  goalMinutes: number;
  /** Start of this stretch out (the notification's ticking clock). */
  outSince: number;
  /** Sunset, or when an unconfirmed stretch would be capped, whichever comes first. */
  stopAt: number;
  /** Eye-level lux per minute in 10-minute steps along the blended weather curve. */
  rates: Array<{ until: number; perMinute: number }>;
  /** Paused by hand until this time: the notification shows it, then counts again (from here on) if you're still out. */
  pausedUntil?: number;
}

/** A plan for the live notification while you're out in daylight, or null when it should be hidden. */
export function getSunlightNotificationPlan(
  presence: Pick<SunlightPresence, 'insidePlaceIds' | 'outSince'>,
  today: SunlightDay,
  goalMinutes: number,
  weather: SunlightWeather | undefined,
  now: number,
  pausedUntil?: number,
): SunlightNotificationPlan | null {
  if (presence.insidePlaceIds == null || presence.insidePlaceIds.length > 0 || presence.outSince == null) return null;
  if (!isSunUp(today, now)) return null;
  const sunset = today.polar === 'day' || today.sunset == null ? addLocalDays(today.dayStart, 1) : today.sunset;
  const stopAt = Math.min(sunset, presence.outSince + MAX_OUTDOOR_STRETCH_MS);
  if (stopAt <= now) return null;
  // While paused the numbers stand still; counting (and the clock) restart when the pause ends.
  const paused = pausedUntil != null && pausedUntil > now;
  const countFrom = paused ? pausedUntil : now;
  // 10-minute steps along the blended curve, until the stop time or the end of the weather.
  const rates: SunlightNotificationPlan['rates'] = [];
  for (let from = countFrom; from < stopAt; from += RATE_STEP_MS) {
    const until = Math.min(stopAt, from + RATE_STEP_MS);
    const lux = weather ? getLuxAt((from + until) / 2, weather.hours, weather.calibration) : undefined;
    if (lux == null) break;
    rates.push({ until, perMinute: lux * getEyeLevelFactorAt(weather?.eyeLevel, from) });
  }
  return {
    snapshotAt: countFrom,
    luxMinutes: today.luxMinutes,
    minutes: today.minutes,
    target: getLightDoseTarget(goalMinutes),
    goalMinutes,
    outSince: paused ? countFrom : presence.outSince,
    stopAt,
    rates,
    ...(paused ? { pausedUntil } : {}),
  };
}

/** A fix every second would flood the sample history, so keep one when the place changes or every few minutes. */
const PRECISE_SAMPLE_GAP_MS = 5 * 60_000;

export function shouldRecordPreciseSample(
  last: Pick<SunlightPresenceSample, 'ts' | 'placeId'> | undefined,
  placeId: string | null,
  ts: number,
): boolean {
  if (!last) return true;
  return placeId !== last.placeId || ts - last.ts >= PRECISE_SAMPLE_GAP_MS;
}

export const MAX_SUNLIGHT_SAMPLES = 500;
export const MAX_SUNLIGHT_EVENTS = 2000;
export const MAX_MANUAL_SESSIONS = 200;
export const MAX_SUNLIGHT_PAUSES = 100;
export const MAX_TRAIL_POINTS = 3000;
/** The path on the map only needs this week's points. */
const TRAIL_KEEP_MS = (SUNLIGHT_HISTORY_DAYS + 1) * 24 * MS_PER_HOUR;

/** Drops trail points over a week older than the newest one, and the oldest beyond the cap. Expects ts order. */
export function pruneTrail(trail: SunlightTrailPoint[]): SunlightTrailPoint[] {
  const newest = trail.at(-1)?.ts;
  if (newest == null) return trail;
  return trail.filter(point => point.ts >= newest - TRAIL_KEEP_MS).slice(-MAX_TRAIL_POINTS);
}

/** The append-only history a background task and the app can both write to. */
export interface SunlightHistory {
  events: SunlightGeofenceEvent[];
  samples: SunlightPresenceSample[];
  deletedRanges: SunlightRange[];
  /** Earlier pauses; the one running now is saved separately. */
  pauses: SunlightRange[];
  manualSessions: SunlightManualSession[];
  /** Start times of manual sessions you deleted, so another copy of the history can't bring them back. */
  deletedManualStarts: number[];
  luxCalibrations: SunlightCalibrationStep[];
  eyeLevelFactors: SunlightCalibrationStep[];
  /** Outside Mode's fine positions, for the path on the map. */
  trail: SunlightTrailPoint[];
}

function unionBy<T>(a: T[] | undefined, b: T[] | undefined, key: (item: T) => string, pick?: (x: T, y: T) => T): T[] {
  const map = new Map<string, T>();
  for (const item of a ?? []) map.set(key(item), item);
  for (const item of b ?? []) {
    const k = key(item);
    const existing = map.get(k);
    map.set(k, existing && pick ? pick(existing, item) : item);
  }
  return [...map.values()];
}

/**
 * Combines two copies of the history. Android can run a geofence event in a separate, short-lived copy of the
 * app while the main one is still alive; each saves its whole state, so without this the last one to save
 * wiped the other's events (a drive out that counted live, then vanished on arrival).
 */
export function mergeSunlightHistory(a: Partial<SunlightHistory>, b: Partial<SunlightHistory>): SunlightHistory {
  const deletedManualStarts = [...new Set([...(a.deletedManualStarts ?? []), ...(b.deletedManualStarts ?? [])])]
    .sort((x, y) => x - y)
    .slice(-MAX_MANUAL_SESSIONS);
  const deletedManual = new Set(deletedManualStarts);
  const byTs = <T extends { ts: number }>(x: T, y: T) => x.ts - y.ts;
  const byFrom = (x: SunlightCalibrationStep, y: SunlightCalibrationStep) => x.from - y.from;
  return {
    events: unionBy(a.events, b.events, event => `${event.ts}|${event.kind}|${event.placeId}`)
      .sort(byTs)
      .slice(-MAX_SUNLIGHT_EVENTS),
    samples: unionBy(a.samples, b.samples, sample => `${sample.ts}|${sample.placeId}`)
      .sort(byTs)
      .slice(-MAX_SUNLIGHT_SAMPLES),
    deletedRanges: unionBy(a.deletedRanges, b.deletedRanges, range => `${range.start}|${range.end}`),
    pauses: unionBy(a.pauses, b.pauses, range => `${range.start}|${range.end}`)
      .sort((x, y) => x.start - y.start)
      .slice(-MAX_SUNLIGHT_PAUSES),
    // A stopped or edited copy of a session wins over one still running.
    manualSessions: unionBy(
      a.manualSessions,
      b.manualSessions,
      session => `${session.start}`,
      (x, y) => (y.end != null || x.end == null ? y : x),
    )
      .filter(session => !deletedManual.has(session.start))
      .sort((x, y) => x.start - y.start)
      .slice(-MAX_MANUAL_SESSIONS),
    deletedManualStarts,
    luxCalibrations: unionBy(a.luxCalibrations, b.luxCalibrations, step => `${step.from}`).sort(byFrom),
    eyeLevelFactors: unionBy(a.eyeLevelFactors, b.eyeLevelFactors, step => `${step.from}`).sort(byFrom),
    trail: pruneTrail(unionBy(a.trail, b.trail, point => `${point.ts}`).sort(byTs)),
  };
}

/** Why an edited session can't be saved, or undefined when it can. */
export function getSessionEditError(start: number, end: number, now: number): string | undefined {
  if (end <= start) return 'End must be after start.';
  if (end > now) return 'End can’t be in the future.';
  if (end - start > MAX_OUTDOOR_STRETCH_MS) return 'A session can be at most 8 h.';
  return undefined;
}

/** A start time no deleted session used, so another saved copy can't delete the edited one by mistake. */
export function getFreeSessionStart(start: number, deletedStarts: number[]): number {
  let next = start;
  const taken = new Set(deletedStarts);
  while (taken.has(next)) next++;
  return next;
}

/** The same day at another clock time (minutes after midnight), for the session time pickers. */
export function setTimeOfDay(ts: number, hours: number, minutes: number): number {
  const date = new Date(ts);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

export interface SunlightLogEntry {
  ts: number;
  source: 'geofence' | 'gps';
  /** Place id for an arrival/departure or a GPS fix inside a place; null = GPS fix away from every place. */
  placeId: string | null;
  kind: 'enter' | 'exit' | 'sample';
  /** Left out of the count: part of a re-registration burst, or GPS wobble at a place's edge. */
  ignored?: boolean;
  /** For a GPS fix away from places: metres past the nearest place's edge and the fix's accuracy. */
  edgeM?: number;
  accuracyM?: number;
}

/** Recent arrivals, departures and GPS checks, newest first (the Tracking log in the sheet). */
export function getSunlightLogEntries(
  events: SunlightGeofenceEvent[],
  samples: SunlightPresenceSample[],
  limit = 60,
): SunlightLogEntry[] {
  const entries: SunlightLogEntry[] = [
    ...events.map(event => ({ ts: event.ts, source: 'geofence' as const, placeId: event.placeId, kind: event.kind })),
    ...samples.map(sample => ({
      ts: sample.ts,
      source: 'gps' as const,
      placeId: sample.placeId,
      kind: 'sample' as const,
    })),
  ];
  return entries.sort((a, b) => b.ts - a.ts).slice(0, limit);
}
