import type { BehaviorEntry, LogEntry } from '../types/behavior';
import { toDateString } from './dateUtils';

export const DEFAULT_STAR_THRESHOLDS: [number, number, number] = [1, 3, 5];

/** Returns the behavior's star thresholds, or `undefined` when the
 *  feature is off (i.e. `starThresholds` is not set on the behavior). */
export function getThresholds(behavior: BehaviorEntry): [number, number, number] | undefined {
  return behavior.starThresholds;
}

/** Number of stars earned (0..3) given a daily log count and the
 *  behavior's thresholds. Pure math; callers should only invoke this
 *  when thresholds are defined. */
export function getEarnedStars(logCount: number, thresholds: [number, number, number]): 0 | 1 | 2 | 3 {
  if (Number.isNaN(logCount) || logCount < 0) return 0;
  let stars = 0;
  for (const t of thresholds) {
    if (logCount >= t) stars += 1;
  }
  return Math.min(stars, thresholds.length) as 0 | 1 | 2 | 3;
}

/** Logs for a given behavior that fall on a given local calendar date. */
export function getLogsForDate(behavior: BehaviorEntry, dateStr: string): LogEntry[] {
  return behavior.logs.filter(log => toDateString(new Date(log.timestamp)) === dateStr);
}

/** Sum of earned stars across all opted-in behaviors for a given date.
 *  Behaviors without `starThresholds` contribute 0. */
export function getTotalStarsForDate(behaviors: BehaviorEntry[], dateStr: string): number {
  let total = 0;
  for (const behavior of behaviors) {
    const thresholds = getThresholds(behavior);
    if (!thresholds) continue;
    const logCount = getLogsForDate(behavior, dateStr).length;
    total += getEarnedStars(logCount, thresholds);
  }
  return total;
}
