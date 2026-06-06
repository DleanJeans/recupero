import type { BehaviorEntry } from '../types/behavior';

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
