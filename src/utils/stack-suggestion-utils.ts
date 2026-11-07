import type { BehaviorEntry } from '../types/behavior';
import { AUTO_STACK_WINDOW_MS } from './day-timeline-utils';

export type StackSuggestionGroup = 'stacked' | 'category' | 'other';

export interface StackSuggestion {
  behavior: BehaviorEntry;
  group: StackSuggestionGroup;
}

interface StackHistory {
  count: number;
  lastTimestamp: number;
}

/** Index of the first value >= target in an ascending array. */
function lowerBound(values: number[], target: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * How often (and when last) each behaviour was stacked with `current`. A log counts as stacked when it shares a
 * stackId with one of `current`'s logs, or when both are manual logs started within AUTO_STACK_WINDOW_MS of each
 * other, the same rule the Day timeline uses to show them as one stack.
 */
export function getStackHistory(current: BehaviorEntry, behaviors: BehaviorEntry[]): Map<string, StackHistory> {
  const stackIds = new Set<string>();
  const manualTimes: number[] = [];
  for (const log of current.logs) {
    if (log.stackId) stackIds.add(log.stackId);
    if (log.source == null) manualTimes.push(log.timestamp);
  }
  manualTimes.sort((a, b) => a - b);

  const history = new Map<string, StackHistory>();
  for (const behavior of behaviors) {
    if (behavior.id === current.id) continue;
    let count = 0;
    let lastTimestamp = 0;
    for (const log of behavior.logs) {
      let stacked = log.stackId != null && stackIds.has(log.stackId);
      if (!stacked && log.source == null && manualTimes.length > 0) {
        const index = lowerBound(manualTimes, log.timestamp - AUTO_STACK_WINDOW_MS);
        stacked = index < manualTimes.length && manualTimes[index] <= log.timestamp + AUTO_STACK_WINDOW_MS;
      }
      if (!stacked) continue;
      count++;
      lastTimestamp = Math.max(lastTimestamp, log.timestamp);
    }
    if (count > 0) history.set(behavior.id, { count, lastTimestamp });
  }
  return history;
}

const byRecent = (a: BehaviorEntry, b: BehaviorEntry) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0);

/**
 * Orders behaviours to suggest for a habit stack with `current`: ones stacked with it before (most often, then most
 * recently), then ones in the same category, then the rest (both by most recently logged). Without `current`, every
 * behaviour is 'other', most recently logged first.
 */
export function rankStackSuggestions(
  behaviors: BehaviorEntry[],
  current: BehaviorEntry | undefined,
  excludeIds: string[] = [],
): StackSuggestion[] {
  const excluded = new Set(excludeIds);
  const candidates = behaviors.filter(behavior => !excluded.has(behavior.id) && behavior.id !== current?.id);
  if (!current) return [...candidates].sort(byRecent).map(behavior => ({ behavior, group: 'other' }));

  const history = getStackHistory(current, candidates);
  const stacked: BehaviorEntry[] = [];
  const category: BehaviorEntry[] = [];
  const other: BehaviorEntry[] = [];
  for (const behavior of candidates) {
    if (history.has(behavior.id)) stacked.push(behavior);
    else if (current.categoryId && behavior.categoryId === current.categoryId) category.push(behavior);
    else other.push(behavior);
  }
  stacked.sort((a, b) => {
    const ha = history.get(a.id) as StackHistory;
    const hb = history.get(b.id) as StackHistory;
    return hb.count - ha.count || hb.lastTimestamp - ha.lastTimestamp;
  });
  category.sort(byRecent);
  other.sort(byRecent);

  return [
    ...stacked.map(behavior => ({ behavior, group: 'stacked' as const })),
    ...category.map(behavior => ({ behavior, group: 'category' as const })),
    ...other.map(behavior => ({ behavior, group: 'other' as const })),
  ];
}
