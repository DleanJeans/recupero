import type { BehaviorEntry } from '../types/behavior';
import type { TaskEntry, TaskList } from '../types/task';
import { timestampAtOperationalMidday, toDateString } from './date-utils';

/** How many tasks can be picked as "Today's 3". */
export const TODAY_FOCUS_LIMIT = 3;
/** Extra stars for finishing all of a day's picked tasks. */
export const FOCUS_BONUS_STARS = 5;

const SHOPPING_PATTERN = /shop|lazada|tiki|amazon|aliexpress|taobao|grocer/i;

/** True for a behavior that is a shopping app or shopping trip (e.g. "Shopee-ng", or tracking the Shopee app). */
export function isShoppingBehavior(behavior: Pick<BehaviorEntry, 'name' | 'autoTrackApp'> | undefined): boolean {
  if (!behavior) return false;
  return (
    SHOPPING_PATTERN.test(behavior.name) ||
    SHOPPING_PATTERN.test(behavior.autoTrackApp?.packageName ?? '') ||
    SHOPPING_PATTERN.test(behavior.autoTrackApp?.label ?? '')
  );
}

/** The Tasks tab a task belongs on. Tasks without a list go to Shopping when linked to a shopping behavior. */
export function getTaskList(
  task: Pick<TaskEntry, 'list'>,
  behavior: Pick<BehaviorEntry, 'name' | 'autoTrackApp'> | undefined,
): TaskList {
  if (task.list) return task.list;
  return isShoppingBehavior(behavior) ? 'shopping' : 'next';
}

export function isTaskFocusedOn(task: Pick<TaskEntry, 'focusDates'>, dateStr: string): boolean {
  return task.focusDates?.includes(dateStr) ?? false;
}

/** Tasks picked as "Today's 3" for the date, in the order they were created. */
export function getFocusTasksForDate(tasks: ReadonlyArray<TaskEntry> | undefined, dateStr: string): TaskEntry[] {
  return (tasks ?? [])
    .filter(task => !task.archived && isTaskFocusedOn(task, dateStr))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** The bonus is earned when a full set of picks (3) is all done on that date. */
export function hasFocusBonusOnDate(tasks: ReadonlyArray<TaskEntry> | undefined, dateStr: string): boolean {
  const focus = getFocusTasksForDate(tasks, dateStr);
  return focus.length >= TODAY_FOCUS_LIMIT && focus.every(task => isTaskCompleteOnDate(task, dateStr));
}

/** Every date on which the "Today's 3" bonus was earned. */
export function getFocusBonusDates(tasks: ReadonlyArray<TaskEntry> | undefined): string[] {
  const dates = new Set<string>();
  for (const task of tasks ?? []) {
    for (const date of task.focusDates ?? []) dates.add(date);
  }
  return [...dates].filter(date => hasFocusBonusOnDate(tasks, date)).sort();
}

/**
 * Days in a row with the "Today's 3" bonus, counting back from today.
 * Today still counts as "in progress", so an unfinished today does not break yesterday's streak.
 */
export function getFocusStreak(tasks: ReadonlyArray<TaskEntry> | undefined, todayStr: string): number {
  const bonusDates = new Set(getFocusBonusDates(tasks));
  const cursor = new Date(`${todayStr}T12:00:00`);
  if (!bonusDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (bonusDates.has(toDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getTasksForDate(tasks: TaskEntry[] | undefined, dateStr: string, dayCutoffHour = 0): TaskEntry[] {
  return (tasks ?? [])
    .filter(task => isTaskVisibleOnDate(task, dateStr, dayCutoffHour))
    .sort((a, b) => {
      const aDone = isTaskCompleteOnDate(a, dateStr);
      const bDone = isTaskCompleteOnDate(b, dateStr);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
}

export function isTaskVisibleOnDate(task: TaskEntry, dateStr: string, dayCutoffHour = 0): boolean {
  if (task.archived) return false;
  if (isTaskCompleteOnDate(task, dateStr)) return true;
  if (task.completedDates.length > 0) return false;
  if (task.scheduledDate === dateStr) return true;
  return dateStr === toDateString(new Date(), dayCutoffHour) && getTaskCreatedDate(task, dayCutoffHour) <= dateStr;
}

export function isTaskCompleteOnDate(task: TaskEntry, dateStr: string): boolean {
  return task.completedDates.includes(dateStr);
}

export function getTaskStarsForDate(tasks: TaskEntry[] | undefined, dateStr: string): number {
  const taskStars = (tasks ?? []).reduce((total, task) => {
    if (task.archived || !isTaskCompleteOnDate(task, dateStr)) return total;
    return total + task.stars;
  }, 0);
  return taskStars + (hasFocusBonusOnDate(tasks, dateStr) ? FOCUS_BONUS_STARS : 0);
}

/**
 * Open tasks for the nav badge: today's picks when any are set, else the open Next up tasks.
 * Shopping and Later items are left out so the badge stays small and doable.
 */
export function getUncompletedTaskCountForDate(
  tasks: TaskEntry[] | undefined,
  dateStr: string,
  dayCutoffHour = 0,
  behaviorById?: ReadonlyMap<string, Pick<BehaviorEntry, 'name' | 'autoTrackApp'>>,
): number {
  const open = getTasksForDate(tasks, dateStr, dayCutoffHour).filter(task => !isTaskCompleteOnDate(task, dateStr));
  const focused = open.filter(task => isTaskFocusedOn(task, dateStr));
  if (getFocusTasksForDate(tasks, dateStr).length > 0) return focused.length;
  return open.filter(
    task => getTaskList(task, task.behaviorId ? behaviorById?.get(task.behaviorId) : undefined) === 'next',
  ).length;
}

export function timestampForTaskDate(dateStr: string, dayCutoffHour = 0): number {
  const todayStr = toDateString(new Date(), dayCutoffHour);
  if (dateStr === todayStr) return Date.now();
  return timestampAtOperationalMidday(dateStr, dayCutoffHour);
}

function getTaskCreatedDate(task: TaskEntry, dayCutoffHour = 0): string {
  if (Number.isFinite(task.createdAt)) return toDateString(new Date(task.createdAt), dayCutoffHour);
  return task.scheduledDate;
}
