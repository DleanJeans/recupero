import type { BehaviorEntry, Category } from '../types/behavior';
import { addDaysToDateString, toDateString } from './date-utils';
import { roundTo2 } from './number-utils';

export const WEEKLY_GOAL_DAYS = 7;

export interface WeeklyGoalDay {
  date: string;
  value: number;
  /** True for today while the day is still in progress. Partial days stay out of the average. */
  partial: boolean;
}

export interface WeeklyGoalSummary {
  categoryId: string;
  categoryName: string;
  fieldKey: string;
  label: string;
  unit?: string;
  goal: number;
  /** Oldest first. The last entry is the selected date. */
  days: WeeklyGoalDay[];
  /** Number of days that count toward the average and net (partial today excluded). */
  countedDays: number;
  average: number;
  /** Average as a percentage of the daily goal. */
  percent: number;
  /** Total over the counted days minus goal x counted days. Negative means under goal. */
  net: number;
  /** Goal x counted days, the budget `net` is measured against. */
  weekGoal: number;
}

/** The `count` dates ending at `endDate`, oldest first. */
export function getWeekDates(endDate: string, count = WEEKLY_GOAL_DAYS): string[] {
  const dates: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    dates.push(addDaysToDateString(endDate, -offset));
  }
  return dates;
}

/** Per-day totals of every metadata field that has a daily goal, for the 7 days ending on `endDate`.
 *  Days without logs count as 0. When `endDate` is `todayStr`, today is shown but left out of the average
 *  and net because the day is not over yet. Order follows category then field order. */
export function getWeeklyGoalSummaries(
  behaviors: BehaviorEntry[],
  categories: Category[],
  endDate: string,
  todayStr: string,
  dayCutoffHour = 0,
): WeeklyGoalSummary[] {
  const dates = getWeekDates(endDate);
  const dateIndex = new Map(dates.map((date, index) => [date, index]));
  const hasPartialDay = endDate === todayStr;
  const countedDays = hasPartialDay ? WEEKLY_GOAL_DAYS - 1 : WEEKLY_GOAL_DAYS;

  const goalFieldsByCategory = new Map<string, Set<string>>();
  for (const category of categories) {
    const keys = (category.metadataFields ?? [])
      .filter(field => field.dailyGoal != null && Number.isFinite(field.dailyGoal) && field.dailyGoal > 0)
      .map(field => field.key);
    if (keys.length > 0) goalFieldsByCategory.set(category.id, new Set(keys));
  }
  if (goalFieldsByCategory.size === 0) return [];

  // category id -> field key -> totals per day
  const totals = new Map<string, Map<string, number[]>>();
  for (const behavior of behaviors) {
    if (!behavior.categoryId) continue;
    const goalKeys = goalFieldsByCategory.get(behavior.categoryId);
    if (!goalKeys) continue;

    let fieldTotals = totals.get(behavior.categoryId);
    if (!fieldTotals) {
      fieldTotals = new Map();
      totals.set(behavior.categoryId, fieldTotals);
    }

    for (const log of behavior.logs) {
      if (!log.metadata) continue;
      const index = dateIndex.get(toDateString(new Date(log.timestamp), dayCutoffHour));
      if (index === undefined) continue;
      for (const key of goalKeys) {
        const value = log.metadata[key];
        if (typeof value !== 'number') continue;
        let perDay = fieldTotals.get(key);
        if (!perDay) {
          perDay = new Array<number>(WEEKLY_GOAL_DAYS).fill(0);
          fieldTotals.set(key, perDay);
        }
        perDay[index] += value;
      }
    }
  }

  const summaries: WeeklyGoalSummary[] = [];
  for (const category of categories) {
    const fieldTotals = totals.get(category.id);
    for (const field of category.metadataFields ?? []) {
      const goal = field.dailyGoal;
      if (goal == null || !goalFieldsByCategory.get(category.id)?.has(field.key)) continue;

      const perDay = fieldTotals?.get(field.key) ?? new Array<number>(WEEKLY_GOAL_DAYS).fill(0);
      const days = dates.map((date, index) => ({
        date,
        value: roundTo2(Math.max(perDay[index], 0)),
        partial: hasPartialDay && index === WEEKLY_GOAL_DAYS - 1,
      }));
      const countedTotal = days.slice(0, countedDays).reduce((sum, day) => sum + day.value, 0);
      const average = countedTotal / countedDays;

      summaries.push({
        categoryId: category.id,
        categoryName: category.name,
        fieldKey: field.key,
        label: field.label,
        unit: field.unit,
        goal,
        days,
        countedDays,
        average: roundTo2(average),
        percent: Math.round((average / goal) * 100),
        net: roundTo2(countedTotal - goal * countedDays),
        weekGoal: roundTo2(goal * countedDays),
      });
    }
  }
  return summaries;
}
