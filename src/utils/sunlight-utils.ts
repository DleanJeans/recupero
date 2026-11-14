import type { SavedPlace } from '../types/cue';
import type {
  SunlightCalibrationStep,
  SunlightDay,
  SunlightGeofenceEvent,
  SunlightManualSession,
  SunlightPresenceSample,
  SunlightRange,
  SunlightStretch,
  SunlightWeather,
  SunlightWeatherHour,
} from '../types/sunlight';
import type { GeoPoint } from './geofence-utils';
import type { ReminderGeofenceRegion } from './reminder-utils';
import { addLocalDays, getDaylightRange, getSunTimes, startOfLocalDay } from './sun-utils';

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

interface PresenceEvent {
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

type PlaceEvent = Pick<SunlightGeofenceEvent, 'ts'> & { kind: string; placeId?: string };

function getPresenceEvents(
  activity: PlaceEvent[],
  samples: SunlightPresenceSample[],
  indoorIds: Set<string>,
): PresenceEvent[] {
  const events: PresenceEvent[] = [];
  for (const event of activity) {
    if ((event.kind !== 'enter' && event.kind !== 'exit') || !event.placeId || !indoorIds.has(event.placeId)) continue;
    events.push({ ts: event.ts, kind: event.kind, placeId: event.placeId });
  }
  for (const sample of samples) {
    events.push({
      ts: sample.ts,
      kind: 'sample',
      placeId: sample.placeId && indoorIds.has(sample.placeId) ? sample.placeId : null,
    });
  }
  return events.sort((a, b) => a.ts - b.ts);
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
  const ranges: SunlightRange[] = [];
  let inside: Set<string> | null = null;
  let outSince: number | null = null;

  const close = (end: number) => {
    if (outSince == null) return;
    const capped = Math.min(end, outSince + MAX_OUTDOOR_STRETCH_MS);
    const start = Math.max(outSince, since);
    if (capped - start >= MIN_OUTDOOR_MS) ranges.push({ start, end: capped });
    outSince = null;
  };

  for (const event of getPresenceEvents(activity, samples, indoorIds)) {
    if (event.ts > now) break;
    const wasOut: boolean = inside != null && inside.size === 0;
    if (event.kind === 'sample') {
      inside = new Set(event.placeId ? [event.placeId] : []);
    } else {
      // Leaving a place while the state is unknown most likely means you're now out.
      inside ??= new Set();
      if (event.kind === 'enter' && event.placeId) inside.add(event.placeId);
      else if (event.placeId) inside.delete(event.placeId);
    }
    const isOut = inside.size === 0;
    if (!wasOut && isOut) outSince = event.ts;
    else if (wasOut && !isOut) close(event.ts);
    // A check that finds you out after a long gap restarts the cap from here.
    else if (wasOut && isOut && event.kind === 'sample' && outSince != null) {
      if (event.ts - outSince > MAX_OUTDOOR_STRETCH_MS) {
        close(event.ts);
        outSince = event.ts;
      }
    }
  }
  const currentOutSince = outSince ?? undefined;
  if (outSince != null) close(now);
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
): Array<SunlightRange & { lux: number }> {
  return sessions
    .filter(session => session.start <= now)
    .map(session => ({
      start: session.start,
      end: Math.min(session.end ?? now, now, session.start + MAX_OUTDOOR_STRETCH_MS),
      lux: session.lux,
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
      stretches.push(stretch);
      if (stretch.lux != null) {
        luxMinutes += getEyeLuxMinutes(stretch, weather?.hours ?? [], weather?.calibration, weather?.eyeLevel);
      }
    }
    for (const range of manualRanges) {
      const overlap = intersect(range, daylight);
      if (!overlap) continue;
      const session = manualSessions.find(candidate => candidate.start === range.start);
      stretches.push({ ...overlap, lux: range.lux, ongoing: session?.end == null && overlap.end >= now, manual: true });
      luxMinutes += (range.lux * (overlap.end - overlap.start)) / MS_PER_MINUTE;
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
): SunlightDay[] {
  const today = startOfLocalDay(now);
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

export type SunlightStatusKind = 'counting' | 'indoors' | 'sunDown' | 'unknown' | 'off';

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
}

/** A plan for the live notification while you're out in daylight, or null when it should be hidden. */
export function getSunlightNotificationPlan(
  presence: Pick<SunlightPresence, 'insidePlaceIds' | 'outSince'>,
  today: SunlightDay,
  goalMinutes: number,
  weather: SunlightWeather | undefined,
  now: number,
): SunlightNotificationPlan | null {
  if (presence.insidePlaceIds == null || presence.insidePlaceIds.length > 0 || presence.outSince == null) return null;
  if (!isSunUp(today, now)) return null;
  const sunset = today.polar === 'day' || today.sunset == null ? addLocalDays(today.dayStart, 1) : today.sunset;
  const stopAt = Math.min(sunset, presence.outSince + MAX_OUTDOOR_STRETCH_MS);
  if (stopAt <= now) return null;
  // 10-minute steps along the blended curve, until the stop time or the end of the weather.
  const rates: SunlightNotificationPlan['rates'] = [];
  for (let from = now; from < stopAt; from += RATE_STEP_MS) {
    const until = Math.min(stopAt, from + RATE_STEP_MS);
    const lux = weather ? getLuxAt((from + until) / 2, weather.hours, weather.calibration) : undefined;
    if (lux == null) break;
    rates.push({ until, perMinute: lux * getEyeLevelFactorAt(weather?.eyeLevel, from) });
  }
  return {
    snapshotAt: now,
    luxMinutes: today.luxMinutes,
    minutes: today.minutes,
    target: getLightDoseTarget(goalMinutes),
    goalMinutes,
    outSince: presence.outSince,
    stopAt,
    rates,
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
