import type { LogEntry } from '../types/behavior';
import { getDayStartTimestamp, MS_PER_DAY, timestampForDateTime, toDateString } from './date-utils';
import { MS_PER_MINUTE } from './time-utils';

export const LEGACY_LOG_XP = 5;

export function getLogStartTimestamp(log: LogEntry): number {
  return log.timestamp;
}

export function getLogEndTimestamp(log: LogEntry): number {
  return log.endTimestamp ?? log.timestamp;
}

export function hasTimedLogRange(log: LogEntry): boolean {
  return log.endTimestamp != null;
}

export function getLogDurationMinutes(log: LogEntry): number {
  if (!hasTimedLogRange(log)) return LEGACY_LOG_XP;
  return Math.round(getLogDurationSeconds(log) / 60);
}

export function getLogDurationSeconds(log: LogEntry): number {
  if (!hasTimedLogRange(log)) return 0;
  return Math.max(0, Math.floor((getLogEndTimestamp(log) - getLogStartTimestamp(log)) / 1000));
}

export function getLogDurationMs(log: LogEntry): number {
  if (!hasTimedLogRange(log)) return 0;
  return Math.max(0, getLogEndTimestamp(log) - getLogStartTimestamp(log));
}

export function getTimeOfDaySeconds(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function getLogGapBounds(olderLog: LogEntry, newerLog: LogEntry): { earlierMs: number; laterMs: number } {
  return {
    earlierMs: getLogEndTimestamp(olderLog),
    laterMs: getLogStartTimestamp(newerLog),
  };
}

export function getLogGapDurationMs(olderLog: LogEntry, newerLog: LogEntry): number {
  const { earlierMs, laterMs } = getLogGapBounds(olderLog, newerLog);
  return Math.max(0, laterMs - earlierMs);
}

export function getDayMaxTimestamp(dateStr: string, now: Date = new Date(), dayCutoffHour = 0): number {
  if (dateStr === toDateString(now, dayCutoffHour)) return now.getTime();
  return getDayStartTimestamp(dateStr, dayCutoffHour) + MS_PER_DAY - 1;
}

export function getDefaultTimedLogStartTimestamp(now: Date = new Date(), dayCutoffHour = 0): number {
  const todayStart = getDayStartTimestamp(toDateString(now, dayCutoffHour), dayCutoffHour);
  return Math.max(todayStart, now.getTime() - LEGACY_LOG_XP * MS_PER_MINUTE);
}

export function getLogFormTimestamp(
  dateStr: string,
  hour: number,
  minute: number,
  dayCutoffHour = 0,
  maxTimestamp = Date.now(),
  second = 0,
): number {
  const timestamp = timestampForDateTime(dateStr, hour, minute, dayCutoffHour, second);
  if (timestamp <= maxTimestamp || dayCutoffHour <= 0 || hour >= dayCutoffHour) return timestamp;

  const maxDate = new Date(maxTimestamp);
  if (dateStr !== toDateString(maxDate)) return timestamp;

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, second, 0).getTime();
}

const SECONDS_PER_DAY = 24 * 60 * 60;

/** Duration between two times of day; an end earlier than the start rolls over midnight. */
export function getTimeRangeDurationMs(startSeconds: number, endSeconds: number): number {
  return ((endSeconds - startSeconds + SECONDS_PER_DAY) % SECONDS_PER_DAY) * 1000;
}

/** Moves an end timestamp that falls before the start to the next calendar day. */
export function getOvernightEndTimestamp(startTimestamp: number, endTimestamp: number): number {
  if (endTimestamp >= startTimestamp) return endTimestamp;
  const date = new Date(endTimestamp);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function formatEndDateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
