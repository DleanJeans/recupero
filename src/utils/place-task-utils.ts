import type { SavedPlace } from '../types/cue';
import type { TaskEntry } from '../types/task';
import { getPlaceIconText } from './cue-utils';
import type { GeofenceWatch } from './reminder-utils';
import { isTaskCompleteOnDate, isTaskVisibleOnDate } from './task-utils';

export const PLACE_TASK_NOTIFICATION_KIND = 'place-task';

/** Passing through or circling the neighbourhood shouldn't count: stay this long by default. */
export const DEFAULT_PLACE_DWELL_MIN = 5;
export const PLACE_DWELL_OPTIONS_MIN = [0, 2, 5, 10, 15, 30, 60] as const;
/** An arrival whose exit we never heard about is dropped after this long. */
export const PLACE_ARRIVAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** When the user entered each place they are still inside, by place id. */
export type PlaceArrivals = Record<string, number>;

export function getPlaceDwellMin(task: Pick<TaskEntry, 'placeDwellMin'>): number {
  const value = task.placeDwellMin;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : DEFAULT_PLACE_DWELL_MIN;
}

export function formatPlaceDwell(minutes: number): string {
  if (minutes <= 0) return 'Instantly';
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}

export function pruneStalePlaceArrivals(arrivals: PlaceArrivals, now: number): PlaceArrivals {
  return Object.fromEntries(
    Object.entries(arrivals).filter(([, enteredAt]) => now - enteredAt < PLACE_ARRIVAL_MAX_AGE_MS),
  );
}

/** Today's unfinished place tasks whose stay is long enough, given when the user entered each place. */
export function getPlaceTasksDueByDwell(
  tasks: TaskEntry[] | undefined,
  arrivals: PlaceArrivals,
  now: number,
  todayStr: string,
  dayCutoffHour = 0,
): TaskEntry[] {
  return Object.entries(arrivals).flatMap(([placeId, enteredAt]) =>
    getPlaceTasksForArrival(tasks, placeId, todayStr, dayCutoffHour).filter(
      task => now - enteredAt >= getPlaceDwellMin(task) * 60_000,
    ),
  );
}

/** Arrive/leave geofences needed by open "Go to this location" tasks, one per place, sorted for a stable signature. */
export function getPlaceTaskGeofenceWatches(tasks: TaskEntry[] | undefined): GeofenceWatch[] {
  const placeIds = new Set<string>();
  for (const task of tasks ?? []) {
    if (task.placeId && !task.archived && task.completedDates.length === 0) placeIds.add(task.placeId);
  }
  return [...placeIds].sort().map(placeId => ({ placeId, enter: true, exit: true }));
}

/** Tasks to tick off when the user arrives at `placeId`: the ones on today's list that aren't done yet. */
export function getPlaceTasksForArrival(
  tasks: TaskEntry[] | undefined,
  placeId: string,
  todayStr: string,
  dayCutoffHour = 0,
): TaskEntry[] {
  return (tasks ?? []).filter(
    task =>
      task.placeId === placeId &&
      isTaskVisibleOnDate(task, todayStr, dayCutoffHour) &&
      !isTaskCompleteOnDate(task, todayStr),
  );
}

export function getPlaceTaskNotificationContent(
  tasks: Pick<TaskEntry, 'title'>[],
  place: Pick<SavedPlace, 'name' | 'emoji' | 'isHome'>,
): { title: string; body: string } {
  const title = tasks.length === 1 ? `Done: ${tasks[0].title}` : `${tasks.length} tasks done`;
  const names = tasks.length === 1 ? '' : ` ${tasks.map(task => task.title).join(', ')}.`;
  return { title, body: `${getPlaceIconText(place)} You arrived at ${place.name}.${names}` };
}
