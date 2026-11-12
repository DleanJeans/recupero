const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const DEG = Math.PI / 180;
/** Sun's centre 0.833° below the horizon: refraction plus the sun's radius (standard sunrise/sunset). */
const SUNRISE_ZENITH_DEG = 90.833;

export interface SunTimes {
  /** Unset when the sun doesn't rise or set that day; see `polar`. */
  sunrise?: number;
  sunset?: number;
  /** 'day' = sun up all day, 'night' = sun down all day. */
  polar?: 'day' | 'night';
}

function dayOfYear(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) / MS_PER_DAY);
}

/**
 * Sunrise and sunset for a calendar date at a place (NOAA approximation, about ±2 minutes).
 * `month` is 0-based like Date. Results are UTC timestamps; the calendar date is the place's local date,
 * so pass the local date's year/month/day.
 */
export function getSunTimesForDate(year: number, month: number, day: number, lat: number, lng: number): SunTimes {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const gamma = ((2 * Math.PI) / (isLeap ? 366 : 365)) * (dayOfYear(year, month, day) - 1);
  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const latRad = lat * DEG;
  const cosHourAngle =
    Math.cos(SUNRISE_ZENITH_DEG * DEG) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);
  if (cosHourAngle > 1) return { polar: 'night' };
  if (cosHourAngle < -1) return { polar: 'day' };
  const hourAngleDeg = Math.acos(cosHourAngle) / DEG;
  // Minutes from UTC midnight of the same calendar date; east of Greenwich this goes negative, which is fine.
  const utcMidnight = Date.UTC(year, month, day);
  const sunriseMin = 720 - 4 * (lng + hourAngleDeg) - eqTimeMin;
  const sunsetMin = 720 - 4 * (lng - hourAngleDeg) - eqTimeMin;
  return {
    sunrise: Math.round(utcMidnight + sunriseMin * MS_PER_MINUTE),
    sunset: Math.round(utcMidnight + sunsetMin * MS_PER_MINUTE),
  };
}

/** Sunrise and sunset on the device's local calendar day containing `ts`. */
export function getSunTimes(ts: number, lat: number, lng: number): SunTimes {
  const date = new Date(ts);
  return getSunTimesForDate(date.getFullYear(), date.getMonth(), date.getDate(), lat, lng);
}

export function startOfLocalDay(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Local midnight `days` days after the one at `dayStart` (DST-safe). */
export function addLocalDays(dayStart: number, days: number): number {
  const date = new Date(dayStart);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime();
}

/** The daylight window (sunrise to sunset) of the local day starting at `dayStart`, or undefined if the sun stays down. */
export function getDaylightRange(
  dayStart: number,
  lat: number,
  lng: number,
): { start: number; end: number } | undefined {
  const dayEnd = addLocalDays(dayStart, 1);
  const sun = getSunTimes(dayStart, lat, lng);
  if (sun.polar === 'night') return undefined;
  if (sun.polar === 'day') return { start: dayStart, end: dayEnd };
  const start = Math.max(dayStart, sun.sunrise ?? dayStart);
  const end = Math.min(dayEnd, sun.sunset ?? dayEnd);
  return end > start ? { start, end } : undefined;
}
