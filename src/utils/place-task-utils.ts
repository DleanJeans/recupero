import type { SavedPlace } from '../types/cue';
import type { OneOffPlace, TaskEntry } from '../types/task';
import { getPlaceIconText } from './cue-utils';
import { clampGeofenceRadius } from './geofence-utils';
import type { GeofenceWatch, ReminderGeofenceRegion } from './reminder-utils';
import { isTaskCompleteOnDate, isTaskVisibleOnDate } from './task-utils';

export const PLACE_TASK_NOTIFICATION_KIND = 'place-task';

const ONE_OFF_PLACE_PREFIX = 'taskplace:';

/** Geofence/arrival id of a task's own place (saved places use their own id). */
export function getTaskPlaceKey(task: Pick<TaskEntry, 'id' | 'placeId' | 'oneOffPlace'>): string | undefined {
  if (task.placeId) return task.placeId;
  return task.oneOffPlace ? `${ONE_OFF_PLACE_PREFIX}${task.id}` : undefined;
}

export function isOneOffPlaceKey(key: string): boolean {
  return key.startsWith(ONE_OFF_PLACE_PREFIX);
}

/** Open tasks that are waiting for the user to arrive somewhere. */
function isOpenPlaceTask(task: TaskEntry): boolean {
  return !task.archived && task.completedDates.length === 0;
}

/** Geofences for the one-off places of open tasks, at the place's own radius (not floored like reminders). */
export function getOneOffPlaceGeofenceRegions(tasks: TaskEntry[] | undefined): ReminderGeofenceRegion[] {
  return (tasks ?? [])
    .filter(task => task.oneOffPlace && !task.placeId && isOpenPlaceTask(task))
    .map(task => {
      const place = task.oneOffPlace as OneOffPlace;
      return {
        identifier: `${ONE_OFF_PLACE_PREFIX}${task.id}`,
        latitude: place.lat,
        longitude: place.lng,
        radius: clampGeofenceRadius(place.radiusM),
        notifyOnEnter: true,
        notifyOnExit: true,
      };
    })
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
}

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
    if (task.placeId && isOpenPlaceTask(task)) placeIds.add(task.placeId);
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
      getTaskPlaceKey(task) === placeId &&
      isTaskVisibleOnDate(task, todayStr, dayCutoffHour) &&
      !isTaskCompleteOnDate(task, todayStr),
  );
}

export function getPlaceTaskNotificationContent(
  tasks: Pick<TaskEntry, 'title'>[],
  place: Pick<SavedPlace, 'name' | 'emoji'> & { isHome?: boolean },
): { title: string; body: string } {
  const title = tasks.length === 1 ? `Done: ${tasks[0].title}` : `${tasks.length} tasks done`;
  const names = tasks.length === 1 ? '' : ` ${tasks.map(task => task.title).join(', ')}.`;
  return {
    title,
    body: `${getPlaceIconText({ emoji: place.emoji, isHome: place.isHome ?? false })} You arrived at ${place.name}.${names}`,
  };
}
