import type { BehaviorEntry, Category, LogEntry } from '../types/behavior';
import { toDateString, yesterday } from './dateUtils';
import { getLogEndTimestamp } from './logUtils';
import { roundTo2 } from './numberUtils';
import { Group } from './strings';

export interface DailyMetadataTotal {
  categoryId: string;
  categoryName: string;
  label: string;
  value: number;
  unit?: string;
  goal?: number;
}

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

export type RecencyGroup =
  | typeof Group.TODAY
  | typeof Group.YESTERDAY
  | typeof Group.THIS_WEEK
  | typeof Group.LAST_WEEK
  | typeof Group.LAST_MONTH
  | typeof Group.OLDER;

export const GROUP_ORDER: RecencyGroup[] = [
  Group.TODAY,
  Group.YESTERDAY,
  Group.THIS_WEEK,
  Group.LAST_WEEK,
  Group.LAST_MONTH,
  Group.OLDER,
];

export function getRecencyGroup(lastTimestamp: number | null): RecencyGroup {
  if (lastTimestamp === null) return 'Older';

  const now = new Date();
  const date = new Date(lastTimestamp);
  const elapsed = now.getTime() - lastTimestamp;
  const minutes = Math.floor(elapsed / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days < 1 && date.getDate() === now.getDate()) return Group.TODAY;

  const y = yesterday();
  const isYesterday =
    date.getFullYear() === y.getFullYear() && date.getMonth() === y.getMonth() && date.getDate() === y.getDate();
  if (isYesterday) return Group.YESTERDAY;

  if (days < 7) return Group.THIS_WEEK;
  if (days < 14) return Group.LAST_WEEK;
  if (days < 60) return Group.LAST_MONTH;
  return Group.OLDER;
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

/** Combined metadata totals for ALL logs on a given date, across all categories.
 *  When the same field label exists in multiple categories, results are prefixed
 *  with the category name for disambiguation.
 *  Returns a list of { label, value } pairs sorted by category then field key. */
export function getAllDailyMetadataTotals(
  behaviors: BehaviorEntry[],
  categories: Category[],
  dateStr: string,
): DailyMetadataTotal[] {
  const result: DailyMetadataTotal[] = [];

  for (const category of categories) {
    const fields = category.metadataFields ?? [];
    if (fields.length === 0) continue;

    const categoryBehaviors = behaviors.filter(b => b.categoryId === category.id);
    const categoryTotals = new Map<string, number>();

    for (const behavior of categoryBehaviors) {
      for (const log of behavior.logs) {
        if (!log.metadata) continue;
        const logDate = toDateString(new Date(log.timestamp));
        if (logDate !== dateStr) continue;
        for (const field of fields) {
          const val = log.metadata[field.key];
          if (typeof val === 'number') {
            const key = field.key;
            categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + val);
          }
        }
      }
    }

    for (const field of fields) {
      const total = categoryTotals.get(field.key);
      if (total === undefined) continue;
      result.push({
        categoryId: category.id,
        categoryName: category.name,
        label: field.label,
        value: roundTo2(total),
        unit: field.unit,
        goal: field.dailyGoal,
      });
    }
  }

  return result;
}

export function groupLogsByRecency(logs: LogEntry[]): RecencySection<LogEntry>[] {
  const sorted = [...logs].sort((a, b) => getLogEndTimestamp(b) - getLogEndTimestamp(a));
  const groups = new Map<RecencyGroup, LogEntry[]>();

  for (const group of GROUP_ORDER) {
    groups.set(group, []);
  }

  for (const log of sorted) {
    const group = getRecencyGroup(getLogEndTimestamp(log));
    groups.get(group)!.push(log);
  }

  return GROUP_ORDER.filter(group => (groups.get(group)?.length ?? 0) > 0).map(title => ({
    title,
    data: groups.get(title)!,
  }));
}
