import type { TaskBug, TaskEntry } from '../types/task';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A bug's weight halves every 2 weeks, so old annoyances cool down on their own. */
export const BUG_HALF_LIFE_DAYS = 14;
/** Heat at which the bar is full (about 4 fresh bugs). */
export const BUG_HEAT_FULL = 4;
/** Minimum heat for a task to show up in "Fix first". */
export const FIX_FIRST_MIN_HEAT = 1;
export const FIX_FIRST_LIMIT = 3;
/** The "Add to Today's 3?" nudge appears at this many bugs within NUDGE_WINDOW_DAYS. */
export const BUG_NUDGE_COUNT = 3;
export const BUG_NUDGE_WINDOW_DAYS = 14;

/** Quick tags offered when logging a bug. */
export const BUG_TAGS = ['⏱ Lost time', '💸 Cost me', '😤 Just annoying'] as const;

export function getBugCount(task: Pick<TaskEntry, 'bugs'>): number {
  return task.bugs?.length ?? 0;
}

export function getLastBugAt(task: Pick<TaskEntry, 'bugs'>): number | undefined {
  const bugs = task.bugs ?? [];
  return bugs.reduce<number | undefined>(
    (latest, bug) => (latest == null || bug.at > latest ? bug.at : latest),
    undefined,
  );
}

/** Sum of 0.5^(days ago / 14) over the bugs. Bugs in the future (clock changes) count as fresh. */
export function getBugHeat(bugs: ReadonlyArray<TaskBug> | undefined, now: number): number {
  let heat = 0;
  for (const bug of bugs ?? []) {
    const days = Math.max(0, (now - bug.at) / DAY_MS);
    heat += 0.5 ** (days / BUG_HALF_LIFE_DAYS);
  }
  return heat;
}

/** Heat as a 0..1 fill for the bar. */
export function getBugHeatFill(heat: number): number {
  return Math.min(1, heat / BUG_HEAT_FULL);
}

/** Open tasks that bugged the user lately, hottest first, skipping Later and already-picked tasks. */
export function getFixFirstTasks(
  tasks: ReadonlyArray<TaskEntry>,
  now: number,
  isEligible: (task: TaskEntry) => boolean,
): TaskEntry[] {
  return tasks
    .filter(task => !task.archived && task.completedDates.length === 0 && isEligible(task))
    .map(task => ({ task, heat: getBugHeat(task.bugs, now) }))
    .filter(entry => entry.heat >= FIX_FIRST_MIN_HEAT)
    .sort((a, b) => b.heat - a.heat || a.task.createdAt - b.task.createdAt)
    .slice(0, FIX_FIRST_LIMIT)
    .map(entry => entry.task);
}

/** Hottest first; tasks with equal heat keep their oldest-first order. */
export function sortByBugHeat(tasks: ReadonlyArray<TaskEntry>, now: number): TaskEntry[] {
  return tasks
    .map(task => ({ task, heat: getBugHeat(task.bugs, now) }))
    .sort((a, b) => b.heat - a.heat || a.task.createdAt - b.task.createdAt)
    .map(entry => entry.task);
}

/** Bugs in the nudge window that came after the last dismissal. */
export function getNudgeBugCount(task: Pick<TaskEntry, 'bugs' | 'bugNudgeDismissedAt'>, now: number): number {
  const since = Math.max(now - BUG_NUDGE_WINDOW_DAYS * DAY_MS, task.bugNudgeDismissedAt ?? 0);
  return (task.bugs ?? []).filter(bug => bug.at > since).length;
}

/** The first open, unpicked task that reached the nudge threshold, hottest first. */
export function getBugNudgeTask(
  tasks: ReadonlyArray<TaskEntry>,
  now: number,
  isEligible: (task: TaskEntry) => boolean,
): TaskEntry | undefined {
  return sortByBugHeat(
    tasks.filter(
      task =>
        !task.archived &&
        task.completedDates.length === 0 &&
        isEligible(task) &&
        getNudgeBugCount(task, now) >= BUG_NUDGE_COUNT,
    ),
    now,
  )[0];
}

/** Heat at the end of each of the last `days` days (oldest first), for the history chart. */
export function getHeatSeries(bugs: ReadonlyArray<TaskBug> | undefined, now: number, days: number): number[] {
  return Array.from({ length: days }, (_, index) => {
    const at = now - (days - 1 - index) * DAY_MS;
    return getBugHeat(
      (bugs ?? []).filter(bug => bug.at <= at),
      at,
    );
  });
}

/** "now", "5 min ago", "3h ago", "2d ago", "3w ago", "4mo ago". */
export function formatBugAgo(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60000);
  if (minutes < 2) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** "5 bugs · 2d ago" for the card's second line. */
export function formatBugSummary(task: Pick<TaskEntry, 'bugs'>, now: number): string | undefined {
  const count = getBugCount(task);
  const last = getLastBugAt(task);
  if (count === 0 || last == null) return undefined;
  return `${count} ${count === 1 ? 'bug' : 'bugs'} · ${formatBugAgo(last, now)}`;
}

export interface BugWhenOption {
  label: string;
  at: number;
}

/** "When did it happen" choices for the log sheet. "This morning" is left out when it would be under an hour ago. */
export function getBugWhenOptions(now: number): BugWhenOption[] {
  const options: BugWhenOption[] = [
    { label: 'Now', at: now },
    { label: '1 h ago', at: now - 60 * 60 * 1000 },
  ];
  const morning = new Date(now);
  morning.setHours(8, 0, 0, 0);
  if (morning.getTime() < now - 2 * 60 * 60 * 1000) options.push({ label: 'This morning', at: morning.getTime() });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);
  options.push({ label: 'Yesterday', at: yesterday.getTime() });
  return options;
}
