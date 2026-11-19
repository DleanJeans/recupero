export type TaskStarValue = 0 | 1 | 2 | 3;
export type TaskSource = 'oneOff' | 'behavior';
/** Which Tasks tab the task lives on. Unset = derived (Shopping when linked to a shopping app/behavior, else Next up). */
export type TaskList = 'next' | 'shopping' | 'someday';

export interface TaskEntry {
  id: string;
  title: string;
  scheduledDate: string;
  stars: TaskStarValue;
  source?: TaskSource;
  behaviorId?: string;
  /** "Go to this location": ticks itself off when the user arrives at this saved place. */
  placeId?: string;
  /** Minutes to stay at the place before the task ticks itself off. Unset means the default (5). */
  placeDwellMin?: number;
  /** Tasks tab this task lives on. Unset means derived, see getTaskList. */
  list?: TaskList;
  /** Dates (yyyy-MM-dd) on which this task was picked as one of "Today's 3". */
  focusDates?: string[];
  completedDates: string[];
  completedAtByDate?: Record<string, number>;
  completionLogIds?: Record<string, string>;
  createdAt: number;
  archived?: boolean;
}

export interface AddTaskInput {
  title: string;
  scheduledDate: string;
  stars: TaskStarValue;
  source?: TaskSource;
  behaviorId?: string;
  placeId?: string;
  placeDwellMin?: number;
  list?: TaskList;
}
