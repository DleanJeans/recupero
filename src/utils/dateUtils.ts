import { parseISO } from 'date-fns';

import { Label } from './strings';

export const MS_PER_DAY = 86400000;

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const a = new Date(later);
  const b = new Date(earlier);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

function daysAgo(dateStr: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = parseISO(dateStr);
  const diff = today.getTime() - date.getTime();
  return Math.floor(diff / MS_PER_DAY);
}

/** Returns a new Date set to one day before the given date (default: now). */
export function yesterday(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

/** Relative day label. Returns "Today", "Yesterday", weekday (this week),
 *  "Last {weekday}" (last week), or empty string for older dates.
 *  When empty, the date picker already shows the date — hide the label. */
export function describeDay(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = new Date();

  if (toDateString(date) === toDateString(today)) return Label.TODAY;
  if (toDateString(date) === toDateString(yesterday())) return Label.YESTERDAY;

  const ago = daysAgo(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  if (ago < 7) return weekday;
  if (ago < 14) return `${Label.LAST_PREFIX}${weekday}`;

  return '';
}
