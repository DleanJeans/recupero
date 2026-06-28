import type { TaskEntry } from '../types/task';
import { toDateString } from './dateUtils';

export function getTasksForDate(tasks: TaskEntry[] | undefined, dateStr: string): TaskEntry[] {
  return (tasks ?? [])
    .filter(task => !task.archived && task.scheduledDate === dateStr)
    .sort((a, b) => {
      const aDone = isTaskCompleteOnDate(a, dateStr);
      const bDone = isTaskCompleteOnDate(b, dateStr);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
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

export function timestampForTaskDate(dateStr: string): number {
  const todayStr = toDateString(new Date());
  if (dateStr === todayStr) return Date.now();
  return new Date(`${dateStr}T12:00:00`).getTime();
}
