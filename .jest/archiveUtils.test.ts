import type { BehaviorEntry } from '../src/types/behavior';
import {
  ARCHIVED_CATEGORY_FILTER_ID,
  countArchivedBehaviors,
  getActiveBehaviors,
  getArchivedBehaviors,
  isArchived,
  isArchivedCategoryFilterId,
} from '../src/utils/archive-utils';

const behavior = (id: string, archivedAt?: number): BehaviorEntry => ({
  id,
  name: id,
  type: 'neutral',
  lastTimestamp: null,
  metadata: {},
  logs: [],
  cooldownMinutes: 0,
  ...(archivedAt != null ? { archivedAt } : {}),
});

describe('archive-utils', () => {
  const behaviors = [behavior('a'), behavior('b', 100), behavior('c'), behavior('d', 300)];

  it('treats behaviours without archivedAt as active (older saved data)', () => {
    expect(isArchived(behavior('a'))).toBe(false);
    expect(isArchived(behavior('b', 1))).toBe(true);
  });

  it('keeps active behaviours in order', () => {
    expect(getActiveBehaviors(behaviors).map(b => b.id)).toEqual(['a', 'c']);
  });

  it('returns the same array when nothing is archived', () => {
    const none = [behavior('a'), behavior('c')];
    expect(getActiveBehaviors(none)).toBe(none);
  });

  it('lists archived behaviours, most recently archived first', () => {
    expect(getArchivedBehaviors(behaviors).map(b => b.id)).toEqual(['d', 'b']);
    expect(countArchivedBehaviors(behaviors)).toBe(2);
  });

  it('recognises the Archived filter id', () => {
    expect(isArchivedCategoryFilterId(ARCHIVED_CATEGORY_FILTER_ID)).toBe(true);
    expect(isArchivedCategoryFilterId(null)).toBe(false);
  });
});
