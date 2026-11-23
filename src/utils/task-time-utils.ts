import type { BehaviorEntry, Category } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { getFirstLinkField } from './metadata-link-utils';

/** A timer that is running right now for a task (paused timers are not: their finished part is already logged). */
export interface RunningTaskTimer {
  taskId?: string;
  startTimestamp?: number;
  stopTimestamp?: number;
}

/**
 * Time spent per task, summed over every timed log linked to it: logs whose category Task field points at the task,
 * and the log made when the task was ticked. Pause/resume segments are separate logs, so paused time is never counted.
 * A running timer adds its elapsed time so far.
 */
export function getTaskTimeSpentMs(
  behaviors: ReadonlyArray<BehaviorEntry>,
  categories: ReadonlyArray<Category>,
  tasks: ReadonlyArray<TaskEntry> | undefined,
  runningTimers: ReadonlyArray<RunningTaskTimer>,
  now: number,
): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (taskId: string, ms: number) => {
    if (ms > 0) totals.set(taskId, (totals.get(taskId) ?? 0) + ms);
  };
  const taskIds = new Set((tasks ?? []).map(task => task.id));
  const completionLogs = new Map<string, string>();
  for (const task of tasks ?? []) {
    for (const logId of Object.values(task.completionLogIds ?? {})) completionLogs.set(logId, task.id);
  }
  const categoryById = new Map(categories.map(category => [category.id, category]));

  for (const behavior of behaviors) {
    const field = getFirstLinkField(
      behavior.categoryId ? categoryById.get(behavior.categoryId)?.metadataFields : undefined,
      'task',
    );
    for (const log of behavior.logs) {
      if (log.endTimestamp == null || log.endTimestamp <= log.timestamp) continue;
      const linked = field ? log.metadata?.[field.key] : undefined;
      const taskId = linked != null && linked !== '' && taskIds.has(String(linked)) ? String(linked) : undefined;
      const owner = taskId ?? completionLogs.get(log.id);
      if (owner) add(owner, log.endTimestamp - log.timestamp);
    }
  }
  for (const timer of runningTimers) {
    if (timer.taskId && timer.startTimestamp != null && timer.stopTimestamp == null) {
      add(timer.taskId, now - timer.startTimestamp);
    }
  }
  return totals;
}

/** "1h 20m", "45m", "2m". Under a minute shows nothing (undefined) so the chip stays hidden. */
export function formatTaskTime(ms: number): string | undefined {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes}m`;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}
