export type TaskStarValue = 0 | 1 | 2 | 3;
export type TaskSource = 'oneOff' | 'behavior';
/** Which Tasks tab the task lives on. Unset = derived (Shopping when linked to a shopping app/behavior, else Next up). */
export type TaskList = 'next' | 'shopping' | 'someday';

/** A place picked just for one task (not in saved places). Arrival works like a saved place. */
export interface OneOffPlace {
  name: string;
  emoji?: string;
  lat: number;
  lng: number;
  radiusM: number;
}

/** One time the task's problem bugged the user again ("Bugged me"). */
export interface TaskBug {
  /** When it happened (ms). */
  at: number;
  note?: string;
  /** Quick tags picked in the log sheet, e.g. "Lost time". */
  tags?: string[];
}

export interface TaskEntry {
  id: string;
  title: string;
  scheduledDate: string;
  stars: TaskStarValue;
  source?: TaskSource;
  behaviorId?: string;
  /** "Go to this location": ticks itself off when the user arrives at this saved place. */
  placeId?: string;
  /** "Go to this location" with a place that is stored on the task only. Used instead of placeId. */
  oneOffPlace?: OneOffPlace;
  /** Minutes to stay at the place before the task ticks itself off. Unset means the default (5). */
  placeDwellMin?: number;
  /** App opened when the task's timer starts. Its auto-tracked behavior is the task's behavior unless one was picked. */
  appPackage?: string;
  /** App name, kept so it shows even if the app is uninstalled. */
  appLabel?: string;
  /** Icon picked in the task editor (emoji, mix, stack or image, see icon-utils). Shown on the task row. */
  icon?: string;
  /** "Track duration": the task shows a ▶ timer button, and ticking it while that timer runs logs the time. */
  timed?: true;
  /** Planned start time of day, "HH:mm" (24 h). With scheduledDate it says when to do the task. */
  startTime?: string;
  /** Estimated duration in minutes. Unset means the default (5). */
  estimateMin?: number;
  /** "Next step": this task id always starts when this task ends and is scheduled on the same day. */
  nextTaskId?: string;
  /** Last day (yyyy-MM-dd) to finish the task. The card turns red from that day on. */
  deadline?: string;
  /** Optional time of day of the deadline, "HH:mm". Without it the deadline lasts all day. */
  deadlineTime?: string;
  /** Tasks tab this task lives on. Unset means derived, see getTaskList. */
  list?: TaskList;
  /** Dates (yyyy-MM-dd) on which this task was picked as one of "Today's 3". */
  focusDates?: string[];
  /** Every time this task's problem bugged the user again. More recent bugs raise its "heat". */
  bugs?: TaskBug[];
  /** When the "Add to Today's 3?" nudge was dismissed; only bugs after it count toward the next nudge. */
  bugNudgeDismissedAt?: number;
  completedDates: string[];
  completedAtByDate?: Record<string, number>;
  /** When work on the task began (ms), per done day, for tasks timed without a behavior log. */
  completedStartByDate?: Record<string, number>;
  /** Latest drive to the task's place (ms). Logged on the Driving behavior and shown on the timeline. */
  drive?: { start: number; end: number };
  /** Set while the task's own ▶ timer runs (a timed task with no behavior or app). */
  timerStartedAt?: number;
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
  oneOffPlace?: OneOffPlace;
  placeDwellMin?: number;
  appPackage?: string;
  appLabel?: string;
  timed?: true;
  icon?: string;
  list?: TaskList;
  startTime?: string;
  estimateMin?: number;
  nextTaskId?: string;
  deadline?: string;
  deadlineTime?: string;
}
