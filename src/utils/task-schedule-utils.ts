import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';

/** Longest estimate the stepper allows. */
export const MAX_ESTIMATE_MIN = 24 * 60;
/** Step of the estimate stepper, in minutes. */
export const ESTIMATE_STEP_MIN = 5;

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
export function getDeadlineState(task: Pick<TaskEntry, 'deadline'>, todayStr: string): DeadlineState {
  if (!task.deadline) return 'none';
  if (task.deadline < todayStr) return 'overdue';
  return task.deadline === todayStr ? 'today' : 'upcoming';
}
