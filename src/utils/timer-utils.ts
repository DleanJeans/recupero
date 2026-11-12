import type { BehaviorEntry, LogEntry } from '../types/behavior';
import { toDateString } from './date-utils';
import { getLogDurationMs, hasTimedLogRange } from './log-utils';
import { cumulativeXpForLevel, getLevel, xpRequiredForLevel } from './xp-utils';

/** Pausing sooner than this after starting (e.g. a double tap) saves no log. */
export const MIN_TIMER_SEGMENT_MS = 5_000;

export function shouldLogTimerSegment(startTimestamp: number, endTimestamp: number): boolean {
  return endTimestamp - startTimestamp >= MIN_TIMER_SEGMENT_MS;
}

export interface TimerLevelProgress {
  level: number;
  /** Share of the current level earned before this session segment (0–1). */
  before: number;
  /** Share of the current level earned including this segment (0–1). */
  now: number;
  xpInLevel: number;
  xpForLevel: number;
  /** Timer minutes (1 XP each) left to reach the next level. */
  minutesToNext: number;
}

/**
 * Level ring numbers for a running timer: `baseXp` is the behaviour's XP before this segment, `sessionXp` what the
 * segment has earned so far. Once the segment crosses a level, the ring starts again from empty for the new level.
 */
export function getTimerLevelProgress(baseXp: number, sessionXp: number): TimerLevelProgress {
  const totalXp = Math.max(0, baseXp) + Math.max(0, sessionXp);
  const level = getLevel(totalXp);
  const levelStart = cumulativeXpForLevel(level);
  const xpForLevel = xpRequiredForLevel(level);
  const xpInLevel = totalXp - levelStart;
  const before = Math.max(0, Math.min(1, (baseXp - levelStart) / xpForLevel));
  const now = Math.max(0, Math.min(1, xpInLevel / xpForLevel));
  return { level, before, now, xpInLevel, xpForLevel, minutesToNext: Math.max(0, Math.ceil(xpForLevel - xpInLevel)) };
}

/** "35m", "2h 05m". */
export function formatLevelEta(minutes: number): string {
  const whole = Math.max(0, Math.ceil(minutes));
  if (whole < 60) return `${whole}m`;
  const hours = Math.floor(whole / 60);
  return `${hours}h ${String(whole % 60).padStart(2, '0')}m`;
}

/** Today's timed logs of a behaviour (by the day cutoff), newest first. */
export function getTodayTimedLogs(behavior: BehaviorEntry, now: number, dayCutoffHour = 0): LogEntry[] {
  const today = toDateString(new Date(now), dayCutoffHour);
  return behavior.logs
    .filter(log => hasTimedLogRange(log) && toDateString(new Date(log.timestamp), dayCutoffHour) === today)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getTotalLogDurationMs(logs: LogEntry[]): number {
  return logs.reduce((total, log) => total + getLogDurationMs(log), 0);
}
