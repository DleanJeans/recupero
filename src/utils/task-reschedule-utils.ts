import type { TaskEntry } from '../types/task';

type Schedulable = Pick<TaskEntry, 'id' | 'startTime' | 'estimateMin' | 'createdAt'>;

const LAST_MINUTE = 23 * 60 + 59;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function byStart(a: Schedulable, b: Schedulable): number {
  return toMinutes(a.startTime as string) - toMinutes(b.startTime as string) || a.createdAt - b.createdAt;
}

export interface StartChange {
  id: string;
  startTime: string;
}

/**
 * Moves one task to `newStart` and pushes the tasks after it down only as far as needed so none starts before the
 * previous one's planned end (start + estimate). Tasks before it stay put, and nothing goes past 23:59.
 * Returns the moved task first, then every other task whose start changed. `tasks` are one day's open tasks.
 */
export function cascadeReschedule(tasks: ReadonlyArray<Schedulable>, taskId: string, newStart: string): StartChange[] {
  const moved = tasks.find(task => task.id === taskId);
  if (!moved) return [];
  const planned = tasks
    .filter(task => task.startTime)
    .map(task => (task.id === taskId ? { ...task, startTime: newStart } : task))
    .sort(byStart);
  const changes: StartChange[] = [{ id: taskId, startTime: newStart }];
  const movedIndex = planned.findIndex(task => task.id === taskId);
  let previousEnd = toMinutes(newStart) + (moved.estimateMin ?? 0);
  for (const task of planned.slice(movedIndex + 1)) {
    const start = toMinutes(task.startTime as string);
    const pushed = Math.min(LAST_MINUTE, Math.max(start, previousEnd));
    if (pushed !== start) changes.push({ id: task.id, startTime: toTime(pushed) });
    previousEnd = pushed + (task.estimateMin ?? 0);
  }
  return changes;
}

/** Tasks that start before the previous task's planned end, with the time that previous task ends. */
export function findOverlaps(tasks: ReadonlyArray<Schedulable>): Map<string, { suggestedStart: string }> {
  const overlaps = new Map<string, { suggestedStart: string }>();
  const planned = tasks.filter(task => task.startTime).sort(byStart);
  for (let i = 1; i < planned.length; i++) {
    const previous = planned[i - 1];
    const previousEnd = toMinutes(previous.startTime as string) + (previous.estimateMin ?? 0);
    if (previousEnd > toMinutes(planned[i].startTime as string) && previousEnd <= LAST_MINUTE) {
      overlaps.set(planned[i].id, { suggestedStart: toTime(previousEnd) });
    }
  }
  return overlaps;
}

/** Wording of the chip that offers a new start time. `time` is already formatted ("3:15 PM"). */
export function getRescheduleText(kind: 'late' | 'overlap', time: string, pushed: number): string {
  const lead = kind === 'late' ? 'Behind schedule' : 'Overlap';
  return `${lead} · Reschedule to ${time}${pushed > 0 ? ` · pushes ${pushed}` : ''}`;
}
