import type { TaskEntry, TaskStarValue } from '../types/task';

/** What the batch dialog changes. A field that is missing was left on "Keep" and is not touched. */
export interface TaskBatchEdits {
  behavior?: { id: string | undefined; name?: string };
  app?: { packageName: string; label: string };
  /** The App row was cleared (distinct from untouched). */
  clearApp?: true;
  place?: { id: string | undefined; dwellMin: number };
  timed?: boolean;
  stars?: TaskStarValue;
}

export type TaskBatchUpdates = Partial<
  Pick<
    TaskEntry,
    'title' | 'stars' | 'source' | 'behaviorId' | 'placeId' | 'placeDwellMin' | 'appPackage' | 'appLabel' | 'timed'
  >
>;

export type CommonValue<T> = { kind: 'none' } | { kind: 'same'; value: T } | { kind: 'mixed' };

/** What all the values share: nothing set, one value, or a mix (a missing value counts as a value of its own). */
export function getCommonValue<T>(values: (T | undefined)[]): CommonValue<T> {
  if (values.length === 0 || values.every(value => value === undefined)) return { kind: 'none' };
  const first = values[0];
  if (first !== undefined && values.every(value => value === first)) return { kind: 'same', value: first };
  return { kind: 'mixed' };
}

/** Track-duration state across tasks: all on, all off, or a mix. */
export function getTimedState(tasks: Pick<TaskEntry, 'timed'>[]): 'on' | 'off' | 'mixed' {
  const on = tasks.filter(task => task.timed === true).length;
  if (on === 0) return 'off';
  return on === tasks.length ? 'on' : 'mixed';
}

/** Next state when the Track duration box is tapped: mixed and off turn on for all, on turns off for all. */
export function nextTimedValue(current: 'on' | 'off' | 'mixed'): boolean {
  return current !== 'on';
}

/**
 * The changes for one task from the batch edits. `appBehaviorIds` maps a package name to the behavior that
 * tracks that app, for tasks that get an app and have no behavior of their own yet.
 */
export function buildBatchUpdates(
  task: TaskEntry,
  edits: TaskBatchEdits,
  appBehaviorIds: ReadonlyMap<string, string>,
): TaskBatchUpdates {
  const updates: TaskBatchUpdates = {};
  let behaviorId = task.behaviorId;
  let hasApp = task.appPackage != null;

  if (edits.behavior) {
    behaviorId = edits.behavior.id;
    updates.behaviorId = behaviorId;
    if (behaviorId == null && task.source === 'behavior') updates.source = 'oneOff';
    // A task named after its behavior follows the new behavior's name.
    if (behaviorId != null && task.source === 'behavior' && edits.behavior.name) updates.title = edits.behavior.name;
  }
  if (edits.app) {
    updates.appPackage = edits.app.packageName;
    updates.appLabel = edits.app.label;
    hasApp = true;
    if (!edits.behavior && behaviorId == null) {
      behaviorId = appBehaviorIds.get(edits.app.packageName);
      updates.behaviorId = behaviorId;
    }
  } else if (edits.clearApp) {
    updates.appPackage = undefined;
    updates.appLabel = undefined;
    hasApp = false;
  }
  if (edits.place) {
    updates.placeId = edits.place.id;
    updates.placeDwellMin = edits.place.id ? edits.place.dwellMin : undefined;
  }
  if (edits.stars != null) updates.stars = edits.stars;
  if (edits.timed != null || edits.behavior || edits.app || edits.clearApp) {
    const wantTimed = edits.timed ?? task.timed === true;
    updates.timed = wantTimed && (behaviorId != null || hasApp) ? true : undefined;
  }
  return updates;
}
