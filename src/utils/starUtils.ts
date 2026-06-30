import type { BehaviorEntry, LogEntry, StarPeriod } from '../types/behavior';
import { getMonthStart, getWeekStart, toDateString } from './dateUtils';

export const DEFAULT_STAR_THRESHOLDS: [number, number, number] = [1, 3, 5];

/** Returns the behavior's star thresholds, or `undefined` when the
 *  feature is off (i.e. `starThresholds` is not set on the behavior). */
export function getThresholds(behavior: BehaviorEntry): [number, number | null, number | null] | undefined {
  return behavior.starThresholds;
}

/** Effective evaluation period for a behavior's star thresholds. Defaults
 *  to `'day'` for v1 stored data that predates `starPeriod`. */
export function getStarPeriod(behavior: BehaviorEntry): StarPeriod {
  return behavior.starPeriod ?? 'day';
}

/** Inclusive `[start, end]` date-string range for the calendar period
 *  that contains `dateStr`:
 *  - `'day'`:   start === end === dateStr
 *  - `'week'`:  Sun–Sat week (en-US)
 *  - `'month'`: first–last day of the calendar month */
export function getPeriodRange(period: StarPeriod, dateStr: string): { start: string; end: string } {
  if (period === 'day') return { start: dateStr, end: dateStr };
  if (period === 'week') {
    const start = getWeekStart(dateStr);
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return { start, end: toDateString(endDate) };
  }
  const start = getMonthStart(dateStr);
  const startDate = new Date(start);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  return { start, end: toDateString(endDate) };
}

export function getStarPeriodLogCountLabel(period: StarPeriod, dateStr: string, todayStr: string): string {
  if (period === 'day') return dateStr === todayStr ? 'Today' : 'That day';
  if (period === 'week') return getWeekStart(dateStr) === getWeekStart(todayStr) ? 'Week' : 'That week';
  return getMonthStart(dateStr) === getMonthStart(todayStr) ? 'This month' : 'That month';
}

export function getNextStarThreshold(logCount: number, thresholds: readonly (number | null)[]): number | undefined {
  const configuredThresholds = thresholds.filter((threshold): threshold is number => threshold != null);
  return configuredThresholds.find(threshold => logCount < threshold) ?? configuredThresholds.at(-1);
}

/** Number of stars earned (0..3) given a log count and the
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
export function getLogsForDate(behavior: BehaviorEntry, dateStr: string, dayCutoffHour = 0): LogEntry[] {
  return behavior.logs.filter(log => toDateString(new Date(log.timestamp), dayCutoffHour) === dateStr);
}

/** Logs for a given behavior whose timestamps fall inside the calendar
 *  `period` (daily / weekly / monthly) containing `dateStr`. */
export function getLogsForPeriod(
  behavior: BehaviorEntry,
  period: StarPeriod,
  dateStr: string,
  dayCutoffHour = 0,
): LogEntry[] {
  const { start, end } = getPeriodRange(period, dateStr);
  return behavior.logs.filter(log => {
    const d = toDateString(new Date(log.timestamp), dayCutoffHour);
    return d >= start && d <= end;
  });
}

export function getLogCountForPeriod(
  behavior: BehaviorEntry,
  period: StarPeriod,
  dateStr: string,
  dayCutoffHour = 0,
): number {
  const { start, end } = getPeriodRange(period, dateStr);
  let count = 0;

  for (const log of behavior.logs) {
    const d = toDateString(new Date(log.timestamp), dayCutoffHour);
    if (d >= start && d <= end) {
      count += 1;
    }
  }

  return count;
}

/** Sum of earned stars across all opted-in behaviors for a given date.
 *  Each behavior uses its own `starPeriod` (defaulting to `'day'`).
 *  Behaviors without `starThresholds` contribute 0. */
export function getTotalStarsForDate(behaviors: BehaviorEntry[], dateStr: string, dayCutoffHour = 0): number {
  let total = 0;
  for (const behavior of behaviors) {
    const thresholds = getThresholds(behavior);
    if (!thresholds) continue;
    const logCount = getLogCountForPeriod(behavior, getStarPeriod(behavior), dateStr, dayCutoffHour);
    total += getEarnedStars(logCount, thresholds);
  }
  return total;
}
