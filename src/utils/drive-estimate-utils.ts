import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { getTaskPlaceKey } from './place-task-utils';
import { getAverageDurationMin } from './task-schedule-utils';

/** Drive time assumed until the user has driven to a place, or logged any driving. */
export const DEFAULT_DRIVE_MIN = 15;

export function isDrivingBehavior(behavior: Pick<BehaviorEntry, 'name' | 'archivedAt'>): boolean {
  return behavior.name.trim().toLowerCase() === 'driving' && behavior.archivedAt == null;
}

/** Minutes the drive to the task's place usually takes: past drives there, else all driving logs, else the default. */
export function getDriveEstimateMin(
  task: Pick<TaskEntry, 'id' | 'placeId' | 'oneOffPlace' | 'driveEstimateMin'>,
  tasks: ReadonlyArray<TaskEntry>,
  driving: Pick<BehaviorEntry, 'logs'> | undefined,
): number {
  if (task.driveEstimateMin) return task.driveEstimateMin;
  const key = getTaskPlaceKey(task);
  // A value set by hand for another task at the same place is remembered for this place.
  const remembered = tasks
    .filter(candidate => candidate.driveEstimateMin && getTaskPlaceKey(candidate) === key)
    .sort((a, b) => b.createdAt - a.createdAt)[0]?.driveEstimateMin;
  if (remembered) return remembered;
  const past = tasks
    .filter(candidate => candidate.drive && getTaskPlaceKey(candidate) === key)
    .map(candidate => (candidate.drive ? (candidate.drive.end - candidate.drive.start) / 60000 : 0));
  if (past.length > 0) return Math.max(1, Math.round(past.reduce((sum, minutes) => sum + minutes, 0) / past.length));
  return getAverageDurationMin(driving) ?? DEFAULT_DRIVE_MIN;
}

/** Average minutes of the user's past drives to this task's place, if any. */
export function getPlaceDriveAverageMin(
  task: Pick<TaskEntry, 'placeId' | 'oneOffPlace' | 'id'>,
  tasks: ReadonlyArray<TaskEntry>,
): number | undefined {
  const key = getTaskPlaceKey(task);
  const past = tasks
    .filter(candidate => candidate.drive && getTaskPlaceKey(candidate) === key)
    .map(candidate => (candidate.drive ? (candidate.drive.end - candidate.drive.start) / 60000 : 0));
  if (past.length === 0) return undefined;
  return Math.max(1, Math.round(past.reduce((sum, minutes) => sum + minutes, 0) / past.length));
}
