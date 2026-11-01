import type { BodySensationLog, MoodLog } from '../types/cue';
import type { DayLogEntry } from './behavior-utils';
import { toDateString } from './date-utils';

/** One row on the Day screen timeline, newest first. */
export type DayTimelineItem =
  | { kind: 'behavior'; key: string; timestamp: number; entries: DayLogEntry[] }
  | { kind: 'mood'; key: string; timestamp: number; log: MoodLog }
  | { kind: 'body'; key: string; timestamp: number; log: BodySensationLog };

/** Habit-stacked logs are separate LogEntries sharing a stackId; every other log stands alone. */
function getStackKey(entry: DayLogEntry): string {
  return entry.log.stackId ? `stack:${entry.log.stackId}` : `log:${entry.log.id}`;
}

export function buildDayTimeline(
  dayLogs: DayLogEntry[],
  moodLogs: MoodLog[],
  bodyLogs: BodySensationLog[],
  dateStr: string,
  dayCutoffHour = 0,
): DayTimelineItem[] {
  const items: DayTimelineItem[] = [];
  const stacks = new Map<string, Extract<DayTimelineItem, { kind: 'behavior' }>>();

  for (const entry of dayLogs) {
    const stackKey = getStackKey(entry);
    const existing = stacks.get(stackKey);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    const item = { kind: 'behavior' as const, key: entry.log.id, timestamp: entry.log.timestamp, entries: [entry] };
    stacks.set(stackKey, item);
    items.push(item);
  }

  const isOnDate = (ts: number) => toDateString(new Date(ts), dayCutoffHour) === dateStr;
  for (const log of moodLogs) {
    if (isOnDate(log.ts)) items.push({ kind: 'mood', key: `mood:${log.id}`, timestamp: log.ts, log });
  }
  for (const log of bodyLogs) {
    if (isOnDate(log.ts)) items.push({ kind: 'body', key: `body:${log.id}`, timestamp: log.ts, log });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
