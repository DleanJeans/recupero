import type { SavedPlace } from '../types/cue';
import type { TaskEntry } from '../types/task';
import { getPlaceEmoji } from './cue-utils';
import type { GeofenceWatch } from './reminder-utils';
import { isTaskCompleteOnDate, isTaskVisibleOnDate } from './task-utils';

export const PLACE_TASK_NOTIFICATION_KIND = 'place-task';

/** Arrival geofences needed by open "Go to this location" tasks, one per place, sorted for a stable signature. */
export function getPlaceTaskGeofenceWatches(tasks: TaskEntry[] | undefined): GeofenceWatch[] {
  const placeIds = new Set<string>();
  for (const task of tasks ?? []) {
    if (task.placeId && !task.archived && task.completedDates.length === 0) placeIds.add(task.placeId);
  }
  return [...placeIds].sort().map(placeId => ({ placeId, enter: true }));
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
  return { title, body: `${getPlaceEmoji(place)} You arrived at ${place.name}.${names}` };
}
