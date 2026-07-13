import { parseISO } from 'date-fns';

import { Label } from './strings';

export const MS_PER_DAY = 86400000;
export const DEFAULT_DAY_CUTOFF_HOUR = 0;

export function normalizeDayCutoffHour(hour: number): number {
  if (!Number.isFinite(hour)) return DEFAULT_DAY_CUTOFF_HOUR;
  return Math.max(0, Math.min(23, Math.trunc(hour)));
}

function getOperationalDate(date: Date, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): Date {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - normalizeDayCutoffHour(dayCutoffHour));
  return shifted;
}

export function toDateString(date: Date, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): string {
  const operationalDate = getOperationalDate(date, dayCutoffHour);
  return `${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, '0')}-${String(operationalDate.getDate()).padStart(2, '0')}`;
}

export function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  const local = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return local;
}

/** Calendar-day difference between `later` and `earlier`, both as ms timestamps.
 *  Counts whole day-boundaries crossed (e.g. Wed 11pm → Fri 1am = 1 day, NOT 0.083).
 *  Negative when `later` precedes `earlier`. */
export function calendarDayDiff(later: number | Date, earlier: number | Date): number {
  return operationalDayDiff(later, earlier);
}

export function operationalDayDiff(
  later: number | Date,
  earlier: number | Date,
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): number {
  const a = new Date(later);
  const b = new Date(earlier);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round(
    (startOfDay(getOperationalDate(a, dayCutoffHour)).getTime() -
      startOfDay(getOperationalDate(b, dayCutoffHour)).getTime()) /
      MS_PER_DAY,
  );
}

function daysAgo(dateStr: string, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): number {
  const now = new Date();
  return operationalDayDiff(now, timestampAtOperationalMidday(dateStr, dayCutoffHour), dayCutoffHour);
}

/** Returns a new Date set to one day before the given date (default: now). */
export function yesterday(date: Date = new Date(), dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): Date {
  const operationalDate = getOperationalDate(date, dayCutoffHour);
  const d = new Date(operationalDate.getFullYear(), operationalDate.getMonth(), operationalDate.getDate());
  d.setDate(d.getDate() - 1);
  return d;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function getDayStartTimestamp(dateStr: string, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, normalizeDayCutoffHour(dayCutoffHour), 0, 0, 0).getTime();
}

export function timestampForDateTime(
  dateStr: string,
  hour: number,
  minute: number,
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
  second = 0,
): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cutoff = normalizeDayCutoffHour(dayCutoffHour);
  const d = new Date(year, month - 1, day, hour, minute, second, 0);
  if (cutoff > 0 && hour < cutoff) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export function timestampAtOperationalMidday(dateStr: string, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): number {
  const d = new Date(getDayStartTimestamp(dateStr, dayCutoffHour));
  d.setHours(d.getHours() + 12);
  return d.getTime();
}

export function previousDateString(dateStr: string): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

/** Sunday-anchored start of the calendar week containing `dateStr`.
 *  Week spans Sun–Sat (en-US convention). */
export function getWeekStart(dateStr: string): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toDateString(d);
}

/** First day of the calendar month containing `dateStr`. */
export function getMonthStart(dateStr: string): string {
  const d = parseISO(dateStr);
  return toDateString(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Relative day label. Returns "Today", "Yesterday", weekday (this week),
 *  "Last {weekday}" (last week), or "{n}d ago" for older dates. */
export function describeDay(dateStr: string, dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR): string {
  const date = parseISO(dateStr);
  const today = new Date();
  const todayStr = toDateString(today, dayCutoffHour);
  const yesterdayStr = toDateString(yesterday(today, dayCutoffHour));

  if (dateStr === todayStr) return Label.TODAY;
  if (dateStr === yesterdayStr) return Label.YESTERDAY;

  const ago = daysAgo(dateStr, dayCutoffHour);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const thisWeekStart = getWeekStart(todayStr);
  const lastWeekStart = addDaysToDateString(thisWeekStart, -7);

  if (ago < 7 && dateStr >= thisWeekStart) return weekday;
  if (dateStr >= lastWeekStart && dateStr < thisWeekStart) return `${Label.LAST_PREFIX} ${weekday}`;

  return `${ago}d${Label.AGO}`;
}
