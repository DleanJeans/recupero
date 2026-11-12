import type { CueActivityEvent, SavedPlace } from '../types/cue';
import type {
  SunlightDay,
  SunlightPresenceSample,
  SunlightRange,
  SunlightStretch,
  SunlightWeather,
  SunlightWeatherHour,
} from '../types/sunlight';
import type { GeoPoint } from './geofence-utils';
import type { GeofenceWatch } from './reminder-utils';
import { addLocalDays, getDaylightRange, getSunTimes, startOfLocalDay } from './sun-utils';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

export const DEFAULT_SUNLIGHT_GOAL_MINUTES = 30;
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

/** Arrive and leave events for every indoor place, so the shared geofence task records them. */
export function getSunlightGeofenceWatches(
  enabled: boolean,
  places: SavedPlace[],
  outdoorPlaceIds: string[],
): GeofenceWatch[] {
  if (!enabled) return [];
  return getIndoorPlaces(places, outdoorPlaceIds).map(place => ({ placeId: place.id, enter: true, exit: true }));
}

function getPresenceEvents(
  activity: CueActivityEvent[],
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
export function getOutdoorRanges(
  activity: CueActivityEvent[],
  samples: SunlightPresenceSample[],
  indoorPlaces: SavedPlace[],
  since: number,
  now: number,
): SunlightRange[] {
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
  return ranges.filter(range => range.end > since);
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
  return {
    dayStart,
    located: point != null,
    minutes: Math.floor(totalMs / MS_PER_MINUTE),
    stretches,
    sunrise: sun?.sunrise,
    sunset: sun?.sunset,
    polar: sun?.polar,
    lux,
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

/** One line under the Sunlight bar: what's happening now and when the sun sets or rises. */
export function getSunlightDetail(
  today: SunlightDay,
  outNow: boolean,
  now: number,
  formatTime: (ts: number) => string,
  tomorrowSunrise?: number,
): string {
  if (!today.located) return 'Save a place so the app knows when the sun is up';
  const beforeSunrise = today.sunrise != null && now < today.sunrise;
  const afterSunset = today.sunset != null && now >= today.sunset;
  if (beforeSunrise) return `Sun rises at ${formatTime(today.sunrise as number)}`;
  if (afterSunset) {
    return tomorrowSunrise != null ? `Sun is down · rises at ${formatTime(tomorrowSunrise)}` : 'Sun is down';
  }
  if (today.polar === 'night') return 'Sun is down all day';
  const sets = today.sunset != null ? `sun sets at ${formatTime(today.sunset)}` : 'sun up all day';
  return outNow ? `Outside now, counting · ${sets}` : `Indoors · ${sets}`;
}
