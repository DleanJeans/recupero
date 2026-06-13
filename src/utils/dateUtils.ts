import { parseISO } from 'date-fns';

const MS_PER_DAY = 86400000;

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

  if (toDateString(date) === toDateString(today)) return 'Today';
  if (toDateString(date) === toDateString(yesterday())) return 'Yesterday';

  const ago = daysAgo(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  if (ago < 7) return weekday;
  if (ago < 14) return `Last ${weekday}`;

  return '';
}
