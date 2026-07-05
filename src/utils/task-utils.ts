import type { TaskEntry } from '../types/task';
import { timestampAtOperationalMidday, toDateString } from './date-utils';

export function getTasksForDate(tasks: TaskEntry[] | undefined, dateStr: string, dayCutoffHour = 0): TaskEntry[] {
  return (tasks ?? [])
    .filter(task => isTaskVisibleOnDate(task, dateStr, dayCutoffHour))
    .sort((a, b) => {
      const aDone = isTaskCompleteOnDate(a, dateStr);
      const bDone = isTaskCompleteOnDate(b, dateStr);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
}

export function isTaskVisibleOnDate(task: TaskEntry, dateStr: string, dayCutoffHour = 0): boolean {
  if (task.archived) return false;
  if (isTaskCompleteOnDate(task, dateStr)) return true;
  if (task.completedDates.length > 0) return false;
  if (task.scheduledDate === dateStr) return true;
  return dateStr === toDateString(new Date(), dayCutoffHour) && getTaskCreatedDate(task, dayCutoffHour) <= dateStr;
}

export function isTaskCompleteOnDate(task: TaskEntry, dateStr: string): boolean {
  return task.completedDates.includes(dateStr);
}

export function getTaskStarsForDate(tasks: TaskEntry[] | undefined, dateStr: string): number {
  return (tasks ?? []).reduce((total, task) => {
    if (task.archived || !isTaskCompleteOnDate(task, dateStr)) return total;
    return total + task.stars;
  }, 0);
}

export function getUncompletedTaskCountForDate(
  tasks: TaskEntry[] | undefined,
  dateStr: string,
  dayCutoffHour = 0,
): number {
  return getTasksForDate(tasks, dateStr, dayCutoffHour).filter(task => !isTaskCompleteOnDate(task, dateStr)).length;
}

export function timestampForTaskDate(dateStr: string, dayCutoffHour = 0): number {
  const todayStr = toDateString(new Date(), dayCutoffHour);
  if (dateStr === todayStr) return Date.now();
  return timestampAtOperationalMidday(dateStr, dayCutoffHour);
}

function getTaskCreatedDate(task: TaskEntry, dayCutoffHour = 0): string {
  if (Number.isFinite(task.createdAt)) return toDateString(new Date(task.createdAt), dayCutoffHour);
  return task.scheduledDate;
}
