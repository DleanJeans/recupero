import { useSettingsStore } from '../store/settingsStore';
import { toDateString, yesterday } from './dateUtils';

import { Label, Unit } from './strings';

export const MS_PER_MINUTE = 60000;
export { MS_PER_DAY } from './dateUtils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTime(timestamp: number, hour12?: boolean): string {
  const resolved = hour12 ?? useSettingsStore.getState().timeFormat === '12h';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: resolved,
  });
}

export function formatTimeRange(startTimestamp: number, endTimestamp?: number, hour12?: boolean): string {
  const start = formatTime(startTimestamp, hour12);
  if (endTimestamp == null) return start;
  const end = formatTime(endTimestamp, hour12);
  return `${start} - ${end}`;
}

export function formatCooldown(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0 || isNaN(totalMinutes)) return '';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes < 24 * 60) return `${Math.floor(totalMinutes / 60)}h`;
  if (totalMinutes < 7 * 24 * 60) return `${Math.floor(totalMinutes / (24 * 60))}d`;
  return `${Math.floor(totalMinutes / (7 * 24 * 60))}w`;
}

interface ElapsedInfo {
  date: Date;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  months: number;
  years: number;
}

function computeElapsed(timestamp: number, nowMs = Date.now()): { now: Date } & ElapsedInfo {
  const now = new Date(nowMs);
  const date = new Date(timestamp);
  const elapsed = nowMs - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  return { now, date, seconds, minutes, hours, days, weeks, months, years };
}

function isSameCalendarDay(a: Date, b: Date, dayCutoffHour = 0): boolean {
  return toDateString(a, dayCutoffHour) === toDateString(b, dayCutoffHour);
}

function isPreviousCalendarMonth(now: Date, date: Date): boolean {
  return (
    (now.getMonth() === 0 && date.getFullYear() === now.getFullYear() - 1 && date.getMonth() === 11) ||
    (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() - 1)
  );
}

/** Calendar-relative text label for a timestamp. Returns empty string when the
 *  time is too recent or too far for a specific label (use formatElapsedNumeric instead). */
export function formatElapsedText(timestamp: number | null): string {
  if (timestamp === null) return '';

  const { now, date, seconds, hours, days } = computeElapsed(timestamp);
  const dayCutoffHour = useSettingsStore.getState().dayCutoffHour;

  if (seconds < 60 || hours < 1) return '';

  if (isSameCalendarDay(date, now, dayCutoffHour)) return Label.TODAY;

  if (isSameCalendarDay(date, yesterday(now, dayCutoffHour))) return Label.YESTERDAY;

  if (days < 7) return DAY_NAMES[date.getDay()];

  if (isPreviousCalendarMonth(now, date)) return Label.LAST_MONTH;

  if (days < 14) return Label.LAST_WEEK;

  const { months } = computeElapsed(timestamp);
  if (date.getFullYear() === now.getFullYear() - 1 && months < 12) return Label.LAST_YEAR;

  return '';
}

/** Combined format: shows calendar text + numeric when both are available, otherwise just one. */
export function formatElapsed(timestamp: number | null): string {
  const text = formatElapsedText(timestamp);
  const numeric = formatElapsedNumeric(timestamp);
  return text ? `${text} · ${numeric}` : numeric;
}

/** Compact relative time label for a timestamp (e.g. "2h ago", "3d ago"). */
export function formatElapsedNumeric(timestamp: number | null, nowMs?: number): string {
  if (timestamp === null) return Label.NEVER;

  const { seconds, minutes, hours, days, weeks, months, years } = computeElapsed(timestamp, nowMs);

  if (seconds < 60) return Label.JUST_NOW;
  if (hours < 1) return `${minutes}${Unit.MIN}${Label.AGO}`;
  if (days < 1) return sub(`${hours}${Unit.HOUR}`, minutes % 60, Unit.MIN);
  if (days < 7) return sub(`${days}${Unit.DAY}`, hours % 24, Unit.HOUR);
  if (days < 60) return sub(`${weeks}${Unit.WEEK}`, days % 7, Unit.DAY);
  if (months < 12) return sub(`${months}${Unit.MONTH}`, days % 30, Unit.DAY);
  return sub(`${years}${Unit.YEAR}`, Math.floor((days % 365) / 30), Unit.MONTH);
}

/** Append a sub-unit when non-zero: e.g. sub("3d", 5, "h") → "3d 5h ago". */
function sub(primary: string, remaining: number, unit: string): string {
  if (remaining > 0) return `${primary} ${remaining}${unit}${Label.AGO}`;
  return `${primary}${Label.AGO}`;
}

/** Compact date string for timeline: returns "Mar 5" for older-than-yesterday timestamps. */
export function formatCompactDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Check if a timestamp is from a previous calendar day (not today, not yesterday). */
export function isOlderThanYesterday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  const dayCutoffHour = useSettingsStore.getState().dayCutoffHour;
  const y = yesterday(now, dayCutoffHour);
  return toDateString(date, dayCutoffHour) < toDateString(y);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return Label.JUST_NOW;

  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    if (remainingHours > 0) {
      return `${days}${Unit.DAY} ${remainingHours}${Unit.HOUR}`;
    }
    if (remainingMinutes > 0) {
      return `${days}${Unit.DAY} ${remainingMinutes}${Unit.MIN}`;
    }
    return `${days}${Unit.DAY}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}${Unit.HOUR} ${remainingMinutes}${Unit.MIN}` : `${hours}${Unit.HOUR}`;
  }

  return `${minutes}${Unit.MIN}`;
}
