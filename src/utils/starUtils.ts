import type { BehaviorEntry, LogEntry } from '../types/behavior';
import { toDateString } from './dateUtils';

export const DEFAULT_STAR_THRESHOLDS: [number, number, number] = [1, 3, 5];

/** Returns the behavior's star thresholds, or `undefined` when the
 *  feature is off (i.e. `starThresholds` is not set on the behavior). */
export function getThresholds(behavior: BehaviorEntry): [number, number | null, number | null] | undefined {
  return behavior.starThresholds;
}

/** Number of stars earned (0..3) given a daily log count and the
 *  behavior's thresholds. A null at index 0 or 1 is a placeholder:
 *  it fills when the first non-null threshold to its right is met.
 *  Nulls with no real threshold to their right are dropped. Pure math;
 *  callers should only invoke this when thresholds are defined. */
export function getEarnedStars(logCount: number, thresholds: readonly (number | null)[]): number {
  if (Number.isNaN(logCount) || logCount < 0) return 0;
  let stars = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const t = thresholds[i];
    if (t != null && logCount >= t) return i + 1;
  }
  return stars;
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
