import type { BehaviorEntry, Category } from '../src/types/behavior';
import {
  getGroupMemberLabel,
  getGroupMembers,
  getGroupNames,
  getGroupTotals,
  normalizeGroupName,
  switchMemberMetadataValues,
} from '../src/utils/behavior-group-utils';
import { XP_PER_LOG } from '../src/utils/xp-utils';

const behavior = (id: string, overrides: Partial<BehaviorEntry> = {}): BehaviorEntry => ({
  id,
  name: id,
  type: 'neutral',
  lastTimestamp: null,
  metadata: {},
  logs: [],
  cooldownMinutes: 0,
  ...overrides,
});

const log = (id: string) => ({ id, timestamp: 0 });

describe('behavior-group-utils', () => {
  it('normalizes group names and treats blank as no group', () => {
    expect(normalizeGroupName('  Omachi   Gold ')).toBe('Omachi Gold');
    expect(normalizeGroupName('   ')).toBeUndefined();
    expect(normalizeGroupName(undefined)).toBeUndefined();
  });

  it('finds members case-insensitively, sorted, without archived siblings', () => {
    const current = behavior('c', { name: 'Omachi Bò Hầm', group: 'Omachi' });
    const behaviors = [
      behavior('a', { name: 'Omachi Xốt Spaghetti', group: 'omachi ' }),
      current,
      behavior('b', { name: 'Omachi Lẩu Tôm', group: 'Omachi', archivedAt: 1 }),
      behavior('d', { name: 'Hảo Hảo', group: 'Hảo Hảo' }),
      behavior('e', { name: 'No group' }),
    ];
    expect(getGroupMembers(behaviors, current).map(b => b.id)).toEqual(['c', 'a']);
    expect(getGroupMembers(behaviors, behaviors[4])).toEqual([]);
  });

  it('keeps the current behaviour even when archived', () => {
    const current = behavior('b', { name: 'Omachi Lẩu Tôm', group: 'Omachi', archivedAt: 1 });
    expect(getGroupMembers([current], current).map(b => b.id)).toEqual(['b']);
  });

  it('strips the group name from chip labels only at a word boundary', () => {
    expect(getGroupMemberLabel('Omachi Bò Hầm', 'Omachi')).toBe('Bò Hầm');
    expect(getGroupMemberLabel('omachi - Lẩu Tôm', 'Omachi')).toBe('Lẩu Tôm');
    expect(getGroupMemberLabel('Omachiya Ramen', 'Omachi')).toBe('Omachiya Ramen');
    expect(getGroupMemberLabel('Omachi', 'Omachi')).toBe('Omachi');
    expect(getGroupMemberLabel('Mì Omachi Bò', 'Omachi')).toBe('Mì Omachi Bò');
  });

  it('lists unique group names', () => {
    const behaviors = [
      behavior('a', { group: 'Omachi' }),
      behavior('b', { group: 'omachi' }),
      behavior('c', { group: 'Coffee' }),
      behavior('d'),
    ];
    expect(getGroupNames(behaviors)).toEqual(['Coffee', 'Omachi']);
  });

  it('totals logs and XP across members', () => {
    const totals = getGroupTotals([
      behavior('a', { logs: [log('1'), log('2')], xpEnabled: true }),
      behavior('b', { logs: [log('3')] }),
    ]);
    expect(totals.logCount).toBe(3);
    expect(totals.xp).toBe(3 * XP_PER_LOG);
    expect(totals.xpEnabled).toBe(true);
  });

  describe('switchMemberMetadataValues', () => {
    const categories: Category[] = [
      {
        id: 'food',
        name: 'Food',
        emoji: '🍜',
        metadataFields: [
          { key: 'weight', label: 'Weight', unit: 'g', calculation: 'amount' },
          { key: 'kcal', label: 'Calorie', calculation: 'per100' },
          { key: 'rating', label: 'Rating', calculation: 'manual' },
        ],
      },
    ];
    const beef = behavior('beef', {
      categoryId: 'food',
      metadataAmountFieldKey: 'weight',
      defaultMetadata: { weight: 81, kcal: 351.8 },
    });
    const shrimp = behavior('shrimp', {
      categoryId: 'food',
      metadataAmountFieldKey: 'weight',
      defaultMetadata: { weight: 78, kcal: 340 },
    });

    it('uses the new member pack weight when the old default was untouched', () => {
      expect(switchMemberMetadataValues({ weight: '81' }, beef, shrimp, categories)).toEqual({ weight: '78' });
    });

    it('keeps values the user typed', () => {
      expect(switchMemberMetadataValues({ weight: '120', rating: '4' }, beef, shrimp, categories)).toEqual({
        weight: '120',
        rating: '4',
      });
    });
  });
});
