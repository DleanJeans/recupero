import type { BehaviorEntry } from '../types/behavior';

export interface BehaviorCounts {
  behaviorCounts: Record<string, number>;
  allCount: number;
}

export function computeBehaviorCounts(behaviors: BehaviorEntry[]): BehaviorCounts {
  const behaviorCounts: Record<string, number> = {};
  for (const b of behaviors) {
    if (b.categoryId) behaviorCounts[b.categoryId] = (behaviorCounts[b.categoryId] ?? 0) + 1;
  }
  return { behaviorCounts, allCount: behaviors.length };
}
