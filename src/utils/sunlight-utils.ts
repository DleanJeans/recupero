import type { SavedPlace } from '../types/cue';
import type {
  SunlightDay,
  SunlightGeofenceEvent,
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
  if (outSince != null) close(now);
  return {
    ranges: ranges.filter(range => range.end > since),
    insidePlaceIds: inside == null ? null : [...(inside as Set<string>)],
  };
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

/** Minute-weighted average estimated lux over a range, from hourly weather (undefined if no hour covers it). */
export function getAverageLux(range: SunlightRange, hours: SunlightWeatherHour[]): number | undefined {
  let weighted = 0;
  let covered = 0;
  for (const hour of hours) {
    const overlap = intersect(range, { start: hour.ts - MS_PER_HOUR, end: hour.ts });
    if (!overlap) continue;
    const ms = overlap.end - overlap.start;
    weighted += estimateLux(hour.wm2) * ms;
    covered += ms;
  }
  return covered > 0 ? weighted / covered : undefined;
}

/** Outdoor time on one local day, counted only between sunrise and sunset there. */
export function getSunlightDay(
  dayStart: number,
  outdoorRanges: SunlightRange[],
  point: GeoPoint | undefined,
  weather: SunlightWeather | undefined,
  now: number,
): SunlightDay {
  const sun = point ? getSunTimes(dayStart, point.lat, point.lng) : undefined;
  const daylight = point ? getDaylightRange(dayStart, point.lat, point.lng) : undefined;
  const stretches: SunlightStretch[] = [];
  if (daylight) {
    for (const range of outdoorRanges) {
      const overlap = intersect(range, daylight);
      if (!overlap) continue;
      stretches.push({
        ...overlap,
        lux: weather ? getAverageLux(overlap, weather.hours) : undefined,
        ongoing: overlap.end >= now && range.end >= now,
      });
    }
  }
  const totalMs = stretches.reduce((sum, stretch) => sum + stretch.end - stretch.start, 0);
  const luxStretches = stretches.filter(stretch => stretch.lux != null);
  const luxMs = luxStretches.reduce((sum, stretch) => sum + stretch.end - stretch.start, 0);
  const lux =
    luxMs > 0
      ? luxStretches.reduce((sum, stretch) => sum + (stretch.lux ?? 0) * (stretch.end - stretch.start), 0) / luxMs
      : undefined;
  const luxMinutes = luxStretches.reduce(
    (sum, stretch) => sum + (stretch.lux ?? 0) * EYE_LEVEL_LUX_FACTOR * ((stretch.end - stretch.start) / MS_PER_MINUTE),
    0,
  );
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
): SunlightDay[] {
  const today = startOfLocalDay(now);
  return Array.from({ length: count }, (_, index) =>
    getSunlightDay(addLocalDays(today, -index), outdoorRanges, point, weather, now),
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
  return weather.lat !== roundCoordinate(point.lat) || weather.lng !== roundCoordinate(point.lng);
}

/** Open-Meteo (free, no key): hourly shortwave radiation for the past week and today. */
export function getWeatherUrl(point: GeoPoint): string {
  const params = [
    `latitude=${roundCoordinate(point.lat)}`,
    `longitude=${roundCoordinate(point.lng)}`,
    'hourly=shortwave_radiation',
    `past_days=${SUNLIGHT_HISTORY_DAYS}`,
    'forecast_days=1',
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

/** Estimated open-ground lux at a moment, from the hour that contains it (undefined if not in the forecast). */
export function getLuxAt(ts: number, hours: SunlightWeatherHour[]): number | undefined {
  const hour = hours.find(candidate => ts > candidate.ts - MS_PER_HOUR && ts <= candidate.ts);
  return hour ? estimateLux(hour.wm2) : undefined;
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
