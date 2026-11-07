import type { BehaviorEntry } from '../types/behavior';

export const ARCHIVED_CATEGORY_FILTER_ID = '__recupero_archived_filter__';
export const ARCHIVED_FILTER_LABEL = 'Archived';

export function isArchivedCategoryFilterId(id: string | null | undefined): boolean {
  return id === ARCHIVED_CATEGORY_FILTER_ID;
}

export function isArchived(behavior: BehaviorEntry): boolean {
  return behavior.archivedAt != null;
}

/** Behaviours that are not archived, in their original order. */
export function getActiveBehaviors(behaviors: BehaviorEntry[]): BehaviorEntry[] {
  return behaviors.some(isArchived) ? behaviors.filter(behavior => !isArchived(behavior)) : behaviors;
}

/** Archived behaviours, most recently archived first. */
export function getArchivedBehaviors(behaviors: BehaviorEntry[]): BehaviorEntry[] {
  return behaviors.filter(isArchived).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
}

export function countArchivedBehaviors(behaviors: BehaviorEntry[]): number {
  return behaviors.filter(isArchived).length;
}
