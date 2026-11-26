import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';

/** Longest estimate the stepper allows. */
export const MAX_ESTIMATE_MIN = 24 * 60;
/** Step of the estimate stepper, in minutes. */
export const ESTIMATE_STEP_MIN = 5;
/** Duration assumed for a task without an estimate, in minutes. */
export const DEFAULT_ESTIMATE_MIN = 5;

/** The task's estimate, or the default when none is set. */
export function getTaskEstimateMin(task: Pick<TaskEntry, 'estimateMin'>): number {
  return task.estimateMin ?? DEFAULT_ESTIMATE_MIN;
}

/** Average length in whole minutes of the behavior's timed logs, or undefined when it has none. */
export function getAverageDurationMin(behavior: Pick<BehaviorEntry, 'logs'> | undefined): number | undefined {
  let total = 0;
  let count = 0;
  for (const log of behavior?.logs ?? []) {
    if (log.endTimestamp == null || log.endTimestamp <= log.timestamp) continue;
    total += log.endTimestamp - log.timestamp;
    count += 1;
  }
  if (count === 0) return undefined;
  return Math.max(1, Math.round(total / count / 60000));
}

/** "45m", "1h", "1h 20m". */
export function formatEstimate(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "9:30 AM" from "HH:mm". */
export function formatStartTime(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "HH:mm" from a Date's local time. */
export function toStartTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** A Date at the local time of "HH:mm" (today), for the time picker. */
export function startTimeToDate(startTime: string | undefined): Date {
  const date = new Date();
  if (!startTime) return date;
  const [h, m] = startTime.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

export type DeadlineState = 'none' | 'upcoming' | 'today' | 'overdue';

/** Where an open task stands against its deadline. yyyy-MM-dd strings compare as text. */
export function getDeadlineState(
  task: Pick<TaskEntry, 'deadline' | 'deadlineTime'>,
  todayStr: string,
  now: Date = new Date(),
): DeadlineState {
  if (!task.deadline) return 'none';
  if (task.deadline < todayStr) return 'overdue';
  if (task.deadline > todayStr) return 'upcoming';
  return task.deadlineTime && task.deadlineTime < toStartTime(now) ? 'overdue' : 'today';
}

/**
 * True when the task's start time is already behind `now`. A task left over from an earlier day still shows today,
 * so its time of day counts as today's (an unfinished 5 PM task isn't late at 4 PM).
 */
export function isStartPassed(
  task: Pick<TaskEntry, 'startTime' | 'scheduledDate'>,
  now: Date,
  todayStr: string,
): boolean {
  if (!task.startTime) return false;
  if (task.scheduledDate > todayStr) return false;
  return task.startTime < toStartTime(now);
}

/** The next quarter hour after `now` ("HH:mm"), capped at 23:45, offered when a start time has passed. */
export function getSuggestedStartTime(now: Date): string {
  const minutes = Math.min(23 * 60 + 45, (Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) + 1) * 15);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Open tasks by start time; tasks without one come last in creation order. */
export function sortByStartTime(tasks: ReadonlyArray<TaskEntry>): TaskEntry[] {
  return [...tasks].sort((a, b) => {
    if (a.startTime && b.startTime && a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
    if (Boolean(a.startTime) !== Boolean(b.startTime)) return a.startTime ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

/** Done tasks of a day in the order they were ticked off. */
export function sortByCompletion(tasks: ReadonlyArray<TaskEntry>, dateStr: string): TaskEntry[] {
  return [...tasks].sort(
    (a, b) => (a.completedAtByDate?.[dateStr] ?? a.createdAt) - (b.completedAtByDate?.[dateStr] ?? b.createdAt),
  );
}

/**
 * When a finished task was really done: the span of the log made for it (a timer session), else the moment it was
 * ticked. Undefined when the task has no completion time on record.
 */
export function getTaskActualTime(
  task: Pick<TaskEntry, 'completionLogIds' | 'completedAtByDate' | 'completedStartByDate'>,
  behavior: Pick<BehaviorEntry, 'logs'> | undefined,
  dateStr: string,
): { start?: number; end: number } | undefined {
  const logId = task.completionLogIds?.[dateStr];
  const log = logId ? behavior?.logs.find(candidate => candidate.id === logId) : undefined;
  if (log) {
    const end = log.endTimestamp ?? log.timestamp;
    return log.endTimestamp != null && log.endTimestamp > log.timestamp ? { start: log.timestamp, end } : { end };
  }
  const completedAt = task.completedAtByDate?.[dateStr];
  if (completedAt == null) return undefined;
  const start = task.completedStartByDate?.[dateStr];
  return start != null && start < completedAt ? { start, end: completedAt } : { end: completedAt };
}

/** `ts` moved to the "HH:mm" time of day on its own calendar day. */
export function withTimeOfDay(ts: number, time: string): number {
  const [h, m] = time.split(':').map(Number);
  const date = new Date(ts);
  date.setHours(h, m, 0, 0);
  return date.getTime();
}
