import type { BehaviorEntry, Category, LogEntry } from '../types/behavior';

/**
 * Sort behaviors by most recent activity (lastTimestamp descending),
 * with null timestamps pushed to the bottom, and name as tiebreaker.
 */
export function sortBehaviorsByRecent(behaviors: BehaviorEntry[]): BehaviorEntry[] {
  return [...behaviors].sort((a, b) => {
    if (a.lastTimestamp === null && b.lastTimestamp === null) return 0;
    if (a.lastTimestamp === null) return 1;
    if (b.lastTimestamp === null) return -1;
    const diff = b.lastTimestamp - a.lastTimestamp;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export type RecencyGroup = 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'Last Month' | 'Older';

export const GROUP_ORDER: RecencyGroup[] = ['Today', 'Yesterday', 'This Week', 'Last Week', 'Last Month', 'Older'];

export function getRecencyGroup(lastTimestamp: number | null): RecencyGroup {
  if (lastTimestamp === null) return 'Older';

  const now = new Date();
  const date = new Date(lastTimestamp);
  const elapsed = now.getTime() - lastTimestamp;
  const minutes = Math.floor(elapsed / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days < 1 && date.getDate() === now.getDate()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';

  if (days < 7) return 'This Week';
  if (days < 14) return 'Last Week';
  if (days < 60) return 'Last Month';
  return 'Older';
}

export interface RecencySection<T = BehaviorEntry> {
  title: RecencyGroup;
  data: T[];
}

export function groupBehaviorsByRecency(behaviors: BehaviorEntry[]): RecencySection[] {
  const sorted = sortBehaviorsByRecent(behaviors);
  const groups = new Map<RecencyGroup, BehaviorEntry[]>();

  for (const group of GROUP_ORDER) {
    groups.set(group, []);
  }

  for (const behavior of sorted) {
    const group = getRecencyGroup(behavior.lastTimestamp);
    groups.get(group)!.push(behavior);
  }

  return GROUP_ORDER.filter(group => (groups.get(group)?.length ?? 0) > 0).map(title => ({
    title,
    data: groups.get(title)!,
  }));
}

/** Sum of numeric metadata fields for a given category and day */
export function getDailyMetadataTotals(
  behaviors: BehaviorEntry[],
  category: Category,
  dateStr: string,
): Record<string, number> {
  const fields = category.metadataFields ?? [];
  if (fields.length === 0) return {};

  const totals: Record<string, number> = {};
  const categoryBehaviors = behaviors.filter(b => b.categoryId === category.id);

  for (const behavior of categoryBehaviors) {
    for (const log of behavior.logs) {
      if (!log.metadata) continue;
      const logDate = toDateString(new Date(log.timestamp));
      if (logDate !== dateStr) continue;
      for (const field of fields) {
        const val = log.metadata[field.key];
        if (typeof val === 'number') {
          totals[field.key] = (totals[field.key] ?? 0) + val;
        }
      }
    }
  }

  return totals;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function groupLogsByRecency(logs: LogEntry[]): RecencySection<LogEntry>[] {
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const groups = new Map<RecencyGroup, LogEntry[]>();

  for (const group of GROUP_ORDER) {
    groups.set(group, []);
  }

  for (const log of sorted) {
    const group = getRecencyGroup(log.timestamp);
    groups.get(group)!.push(log);
  }

  return GROUP_ORDER.filter(group => (groups.get(group)?.length ?? 0) > 0).map(title => ({
    title,
    data: groups.get(title)!,
  }));
}
