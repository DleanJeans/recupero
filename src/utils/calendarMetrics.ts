import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { toDateString } from './dateUtils';
import { getThresholds, getTotalStarsForDate } from './starUtils';
import { getTaskStarsForDate } from './taskUtils';

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

  for (const behavior of behaviors) {
    if (!getThresholds(behavior)) continue;
    for (const log of behavior.logs ?? []) {
      dates.add(toDateString(new Date(log.timestamp), dayCutoffHour));
    }
  }

  for (const task of tasks ?? []) {
    if (task.archived || task.stars <= 0) continue;
    for (const date of task.completedDates ?? []) {
      dates.add(date);
    }
  }

  return Array.from(dates).reduce<CalendarDayMetrics>((metrics, date) => {
    const value = getTotalStarsForDate(behaviors, date, dayCutoffHour) + getTaskStarsForDate(tasks, date);
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
