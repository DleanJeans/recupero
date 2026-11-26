import { useBehaviorStore } from '../store/behavior-store';
import { useTimerStore } from '../store/timer-store';
import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { isDrivingBehavior } from './drive-estimate-utils';
import { buildTimerLogMetadata } from './metadata-link-utils';

/** Id of the Driving behavior, if it exists. */
export function findDrivingBehaviorId(behaviors: ReadonlyArray<BehaviorEntry>): string | undefined {
  return behaviors.find(isDrivingBehavior)?.id;
}

/** The Driving behavior's id, made (with duration tracking) the first time it is needed. */
export function ensureDrivingBehavior(): string {
  const store = useBehaviorStore.getState();
  const existing = findDrivingBehaviorId(store.behaviors);
  if (existing) return existing;
  store.addBehavior(
    'Driving',
    'neutral',
    '🚗',
    0,
    'rest',
    undefined,
    undefined,
    false,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    true,
    undefined,
    undefined,
    true,
  );
  const behaviors = useBehaviorStore.getState().behaviors;
  return behaviors[behaviors.length - 1].id;
}

/** Logs a drive to the task's place on the Driving behavior and remembers it on the task. */
export function recordDrive(taskId: string, start: number, end: number): void {
  if (end <= start) return;
  const drivingId = ensureDrivingBehavior();
  const { behaviors, categories, tasks, logBehavior, updateTask } = useBehaviorStore.getState();
  const driving = behaviors.find(behavior => behavior.id === drivingId);
  const task = tasks?.find(candidate => candidate.id === taskId);
  if (!driving || !task) return;
  logBehavior(drivingId, start, buildTimerLogMetadata(driving, categories, task.title, task.id), end);
  updateTask(taskId, { drive: { start, end } });
}

/** Starts the Driving timer for the task; arriving at its place stops it. */
export function startDrive(task: Pick<TaskEntry, 'id' | 'title'>): void {
  useTimerStore.getState().start(ensureDrivingBehavior(), Date.now(), task.title, undefined, task.id);
}

/** True while the Driving timer of this task is running (on the Timer screen or parked). */
export function isDriveRunning(taskId: string): boolean {
  const drivingId = findDrivingBehaviorId(useBehaviorStore.getState().behaviors);
  if (!drivingId) return false;
  const timer = useTimerStore.getState();
  const isMine = (session: { taskId?: string; lockedBehaviorId?: string; startTimestamp?: number }) =>
    session.taskId === taskId && session.lockedBehaviorId === drivingId && session.startTimestamp != null;
  return isMine(timer) || timer.parked.some(isMine);
}

/** Arriving at the place of a task you were driving to ends the drive and logs it. */
export function finishDrivesAtPlace(tasks: ReadonlyArray<TaskEntry>, now: number): void {
  const drivingId = findDrivingBehaviorId(useBehaviorStore.getState().behaviors);
  if (!drivingId) return;
  for (const task of tasks) {
    if (!isDriveRunning(task.id)) continue;
    const range = useTimerStore.getState().takeRunning(drivingId, now);
    if (range) recordDrive(task.id, range.start, range.end);
  }
}
