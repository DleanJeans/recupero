import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { toDateString } from './date-utils';
import { getEarnedStars, getPeriodRange, getStarPeriod, getThresholds } from './star-utils';

export type CalendarDayMetricType = 'stars' | 'tasks';

export interface CalendarDayMetric {
  type: CalendarDayMetricType;
  value: number;
}

export type CalendarDayMetrics = Record<string, CalendarDayMetric>;

export function getCalendarStarMetrics(
  behaviors: BehaviorEntry[],
  tasks: TaskEntry[] | undefined,
  dayCutoffHour = 0,
): CalendarDayMetrics {
  const dates = new Set<string>();
  const taskStarsByDate = new Map<string, number>();
  const behaviorStarCounts: {
    period: ReturnType<typeof getStarPeriod>;
    thresholds: NonNullable<ReturnType<typeof getThresholds>>;
    countsByPeriod: Map<string, number>;
  }[] = [];

  for (const behavior of behaviors) {
    const thresholds = getThresholds(behavior);
    if (!thresholds) continue;

    const period = getStarPeriod(behavior);
    const countsByPeriod = new Map<string, number>();

    for (const log of behavior.logs ?? []) {
      const date = toDateString(new Date(log.timestamp), dayCutoffHour);
      dates.add(date);

      const periodKey = getPeriodRange(period, date).start;
      countsByPeriod.set(periodKey, (countsByPeriod.get(periodKey) ?? 0) + 1);
    }

    behaviorStarCounts.push({ period, thresholds, countsByPeriod });
  }

  for (const task of tasks ?? []) {
    if (task.archived || task.stars <= 0) continue;
    for (const date of task.completedDates ?? []) {
      dates.add(date);
      taskStarsByDate.set(date, (taskStarsByDate.get(date) ?? 0) + task.stars);
    }
  }

  return Array.from(dates).reduce<CalendarDayMetrics>((metrics, date) => {
    let value = taskStarsByDate.get(date) ?? 0;

    for (const behaviorStars of behaviorStarCounts) {
      const periodKey = getPeriodRange(behaviorStars.period, date).start;
      const logCount = behaviorStars.countsByPeriod.get(periodKey) ?? 0;
      value += getEarnedStars(logCount, behaviorStars.thresholds);
    }

    if (value > 0) {
      metrics[date] = { type: 'stars', value };
    }
    return metrics;
  }, {});
}

export function getCalendarTaskCompletionMetrics(tasks: TaskEntry[] | undefined): CalendarDayMetrics {
  const counts = new Map<string, number>();

  for (const task of tasks ?? []) {
    if (task.archived) continue;
    for (const date of task.completedDates ?? []) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }

  return Array.from(counts).reduce<CalendarDayMetrics>((metrics, [date, value]) => {
    if (value > 0) {
      metrics[date] = { type: 'tasks', value };
    }
    return metrics;
  }, {});
}
