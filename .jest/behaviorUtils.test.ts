import type { BehaviorEntry, Category, LogEntry } from '../src/types/behavior';
import {
  getAllDailyMetadataTotals,
  getBehaviorLogsForDate,
  getDailyMetadataContributions,
  groupBehaviorsByRecency,
} from '../src/utils/behavior-utils';

function ts(dateStr: string, time: string): number {
  return new Date(`${dateStr}T${time}:00`).getTime();
}

function makeLog(id: string, dateStr: string, time: string, metadata?: LogEntry['metadata']): LogEntry {
  return {
    id,
    timestamp: ts(dateStr, time),
    metadata,
  };
}

function makeBehavior(overrides: Partial<BehaviorEntry> = {}): BehaviorEntry {
  return {
    id: 'b1',
    name: 'Breakfast',
    type: 'neutral',
    categoryId: 'food',
    lastTimestamp: null,
    metadata: {},
    logs: [],
    cooldownMinutes: 0,
    ...overrides,
  };
}

describe('daily metadata utilities', () => {
  const categories: Category[] = [
    {
      id: 'food',
      name: 'Food',
      emoji: '🍽️',
      metadataFields: [
        { key: 'protein', label: 'Protein', unit: 'g', dailyGoal: 100 },
        { key: 'fiber', label: 'Fiber', unit: 'g' },
      ],
    },
  ];

  it('returns metadata totals with field keys and matching contributing logs', () => {
    const behavior = makeBehavior({
      logs: [
        makeLog('morning', '2026-07-01', '09:00', { protein: 10, fiber: 3, notes: 'eggs' }),
        makeLog('lunch', '2026-07-01', '12:00', { protein: 20, fiber: 4 }),
        makeLog('other-day', '2026-07-02', '12:00', { protein: 50, fiber: 10 }),
      ],
    });

    const logs = getBehaviorLogsForDate([behavior], '2026-07-01');
    const contributions = getDailyMetadataContributions(logs, categories);

    expect(logs.map(entry => entry.log.id)).toEqual(['lunch', 'morning']);
    expect(getAllDailyMetadataTotals([behavior], categories, '2026-07-01')).toEqual([
      {
        categoryId: 'food',
        categoryName: 'Food',
        fieldKey: 'protein',
        label: 'Protein',
        value: 30,
        unit: 'g',
        goal: 100,
      },
      {
        categoryId: 'food',
        categoryName: 'Food',
        fieldKey: 'fiber',
        label: 'Fiber',
        value: 7,
        unit: 'g',
        goal: undefined,
      },
    ]);
    expect(
      contributions
        .filter(contribution => contribution.fieldKey === 'protein')
        .map(contribution => ({
          logId: contribution.log.id,
          value: contribution.value,
          unit: contribution.unit,
        })),
    ).toEqual([
      { logId: 'lunch', value: 20, unit: 'g' },
      { logId: 'morning', value: 10, unit: 'g' },
    ]);
  });
});

describe('behavior recency utilities', () => {
  it('puts never-logged behaviors before logged behaviors', () => {
    const sections = groupBehaviorsByRecency([
      makeBehavior({ id: 'logged', name: 'Logged', lastTimestamp: Date.now() }),
      makeBehavior({ id: 'never', name: 'Never', lastTimestamp: null }),
    ]);

    expect(sections.map(section => section.title)).toEqual(['Never', 'Today']);
    expect(sections[0].data.map(behavior => behavior.id)).toEqual(['never']);
  });
});
