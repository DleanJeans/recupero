import type { BodySensationLog, MoodLog } from '../types/cue';
import type { DayLogEntry } from './behavior-utils';
import { toDateString } from './date-utils';

/** One row on the Day screen timeline, newest first. */
export type DayTimelineItem =
  | { kind: 'behavior'; key: string; timestamp: number; entries: DayLogEntry[] }
  | { kind: 'mood'; key: string; timestamp: number; log: MoodLog }
  | { kind: 'body'; key: string; timestamp: number; log: BodySensationLog };

/** Manual logs started within this long of the previous log in a group are shown as one habit stack. */
export const AUTO_STACK_WINDOW_MS = 3 * 60 * 1000;

type BehaviorItem = Extract<DayTimelineItem, { kind: 'behavior' }>;

/**
 * Habit-stacked logs are separate LogEntries sharing a stackId. On top of that, manual logs started within
 * AUTO_STACK_WINDOW_MS of each other are chained into the same stack. Auto-tracked logs (app usage, site visits)
 * only stack by id.
 */
function groupBehaviorLogs(dayLogs: DayLogEntry[]): BehaviorItem[] {
  const byStackId = new Map<string, DayLogEntry[]>();
  const groups: DayLogEntry[][] = [];
  for (const entry of dayLogs) {
    const { stackId } = entry.log;
    const existing = stackId ? byStackId.get(stackId) : undefined;
    if (existing) {
      existing.push(entry);
      continue;
    }
    const group = [entry];
    if (stackId) byStackId.set(stackId, group);
    groups.push(group);
  }

  const startOf = (group: DayLogEntry[]) => Math.min(...group.map(entry => entry.log.timestamp));
  const lastOf = (group: DayLogEntry[]) => Math.max(...group.map(entry => entry.log.timestamp));
  const isManual = (group: DayLogEntry[]) => group.every(entry => entry.log.source == null);

  const merged: DayLogEntry[][] = [];
  for (const group of [...groups].sort((a, b) => startOf(a) - startOf(b))) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      isManual(previous) &&
      isManual(group) &&
      startOf(group) - lastOf(previous) <= AUTO_STACK_WINDOW_MS
    ) {
      previous.push(...group);
      continue;
    }
    merged.push([...group]);
  }

  return merged.map(group => {
    const entries = [...group].sort((a, b) => b.log.timestamp - a.log.timestamp);
    return { kind: 'behavior' as const, key: entries[0].log.id, timestamp: entries[0].log.timestamp, entries };
  });
}

export function buildDayTimeline(
  dayLogs: DayLogEntry[],
  moodLogs: MoodLog[],
  bodyLogs: BodySensationLog[],
  dateStr: string,
  dayCutoffHour = 0,
): DayTimelineItem[] {
  const items: DayTimelineItem[] = groupBehaviorLogs(dayLogs);

  const isOnDate = (ts: number) => toDateString(new Date(ts), dayCutoffHour) === dateStr;
  for (const log of moodLogs) {
    if (isOnDate(log.ts)) items.push({ kind: 'mood', key: `mood:${log.id}`, timestamp: log.ts, log });
  }
  for (const log of bodyLogs) {
    if (isOnDate(log.ts)) items.push({ kind: 'body', key: `body:${log.id}`, timestamp: log.ts, log });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
