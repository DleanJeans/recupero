import type { TaskEntry } from '../types/task';
import { getTaskEstimateMin } from './task-schedule-utils';

const LAST_MINUTE = 23 * 60 + 59;

function endTime(task: Pick<TaskEntry, 'startTime' | 'estimateMin'>): string | undefined {
  if (!task.startTime) return undefined;
  const [h, m] = task.startTime.split(':').map(Number);
  const end = Math.min(LAST_MINUTE, h * 60 + m + getTaskEstimateMin(task));
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

/**
 * Keeps "next step" chains together: a task's next step is always on the same day and starts when the task ends
 * (start + estimate). Done tasks are left alone. Returns the same array when nothing needs to move.
 */
export function resolveChains(tasks: TaskEntry[]): TaskEntry[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const isNext = new Set(tasks.map(task => task.nextTaskId).filter((id): id is string => id != null));
  const changed = new Map<string, TaskEntry>();
  const seen = new Set<string>();
  for (const head of tasks) {
    if (isNext.has(head.id) || !head.nextTaskId) continue;
    let current = head;
    while (current.nextTaskId && !seen.has(current.nextTaskId)) {
      const next = byId.get(current.nextTaskId);
      if (!next) break;
      seen.add(next.id);
      const startTime = endTime(current);
      const done = next.completedDates.length > 0;
      const moved =
        !done && (next.startTime !== startTime || next.scheduledDate !== current.scheduledDate)
          ? { ...next, startTime, scheduledDate: current.scheduledDate }
          : next;
      if (moved !== next) changed.set(next.id, moved);
      current = moved;
    }
  }
  if (changed.size === 0) return tasks;
  return tasks.map(task => changed.get(task.id) ?? task);
}

/** The task whose next step is `taskId`, if any. */
export function findPreviousStep<T extends Pick<TaskEntry, 'id' | 'nextTaskId'>>(
  tasks: ReadonlyArray<T>,
  taskId: string,
): T | undefined {
  return tasks.find(task => task.nextTaskId === taskId);
}
