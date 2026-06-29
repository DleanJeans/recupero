import type { LogEntry } from '../types/behavior';
import { toDateString } from './dateUtils';
import { MS_PER_MINUTE } from './timeUtils';

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

export function getDayMaxTimestamp(dateStr: string, now: Date = new Date()): number {
  if (dateStr === toDateString(now)) return now.getTime();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 0, 0).getTime();
}

export function getDefaultTimedLogStartTimestamp(now: Date = new Date()): number {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  return Math.max(todayStart, now.getTime() - LEGACY_LOG_XP * MS_PER_MINUTE);
}
