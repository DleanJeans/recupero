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
  return Math.max(1, Math.round((getLogEndTimestamp(log) - getLogStartTimestamp(log)) / MS_PER_MINUTE));
}

export function getLogDurationMs(log: LogEntry): number {
  if (!hasTimedLogRange(log)) return 0;
  return Math.max(MS_PER_MINUTE, getLogEndTimestamp(log) - getLogStartTimestamp(log));
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
  return getDayStartTimestamp(dateStr, dayCutoffHour) + MS_PER_DAY - MS_PER_MINUTE;
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
): number {
  const timestamp = timestampForDateTime(dateStr, hour, minute, dayCutoffHour);
  if (timestamp <= maxTimestamp || dayCutoffHour <= 0 || hour >= dayCutoffHour) return timestamp;

  const maxDate = new Date(maxTimestamp);
  if (dateStr !== toDateString(maxDate)) return timestamp;

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}
