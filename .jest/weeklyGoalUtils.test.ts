import type { BehaviorEntry, Category } from '../src/types/behavior';
import { getWeekDates, getWeeklyGoalSummaries } from '../src/utils/weekly-goal-utils';

const category: Category = {
  id: 'food',
  name: 'Food',
  emoji: '🍽',
  metadataFields: [
    { key: 'kcal', label: 'Calories', unit: 'kcal', dailyGoal: 2200 },
    { key: 'fat', label: 'Fat', unit: 'g' },
    { key: 'protein', label: 'Protein', unit: 'g', dailyGoal: 100 },
  ],
};

function makeBehavior(logs: { date: string; kcal?: number; protein?: number; fat?: number }[]): BehaviorEntry {
  return {
    id: 'b1',
    name: 'Meal',
    type: 'neutral',
    categoryId: 'food',
    lastTimestamp: null,
    metadata: {},
    logs: logs.map((entry, index) => ({
      id: `l${index}`,
      timestamp: new Date(`${entry.date}T12:00:00`).getTime(),
      metadata: { kcal: entry.kcal ?? 0, protein: entry.protein ?? 0, fat: entry.fat ?? 0 },
    })),
    cooldownMinutes: 0,
  } as BehaviorEntry;
}

describe('getWeekDates', () => {
  it('returns 7 dates ending on the given date, oldest first', () => {
    expect(getWeekDates('2026-11-09')).toEqual([
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
    ]);
  });
});

describe('getWeeklyGoalSummaries', () => {
  const week = [
    { date: '2026-11-03', kcal: 2450 },
    { date: '2026-11-04', kcal: 1900 },
    { date: '2026-11-05', kcal: 2150 },
    { date: '2026-11-06', kcal: 2600 },
    { date: '2026-11-07', kcal: 1750 },
    { date: '2026-11-08', kcal: 2300 },
    { date: '2026-11-09', kcal: 2000 },
  ];

  it('averages 7 full days and nets over and under days against goal x 7', () => {
    const [calories] = getWeeklyGoalSummaries([makeBehavior(week)], [category], '2026-11-09', '2026-11-10');
    expect(calories.label).toBe('Calories');
    expect(calories.days.map(day => day.value)).toEqual([2450, 1900, 2150, 2600, 1750, 2300, 2000]);
    expect(calories.countedDays).toBe(7);
    expect(calories.average).toBeCloseTo(2164.29, 1);
    expect(calories.percent).toBe(98);
    expect(calories.net).toBe(-250);
    expect(calories.weekGoal).toBe(15400);
  });

  it('only returns fields that have a daily goal, in field order', () => {
    const labels = getWeeklyGoalSummaries([makeBehavior(week)], [category], '2026-11-09', '2026-11-10').map(
      summary => summary.label,
    );
    expect(labels).toEqual(['Calories', 'Protein']);
  });

  it('leaves partial today out of the average and net', () => {
    const [calories] = getWeeklyGoalSummaries([makeBehavior(week)], [category], '2026-11-09', '2026-11-09');
    expect(calories.days[6].partial).toBe(true);
    expect(calories.countedDays).toBe(6);
    expect(calories.average).toBeCloseTo(2191.67, 1);
    expect(calories.net).toBe(-50);
    expect(calories.weekGoal).toBe(13200);
  });

  it('counts days without logs as 0 and sums several logs on one day', () => {
    const behavior = makeBehavior([
      { date: '2026-11-09', kcal: 500 },
      { date: '2026-11-09', kcal: 700 },
    ]);
    const [calories] = getWeeklyGoalSummaries([behavior], [category], '2026-11-09', '2026-11-10');
    expect(calories.days.map(day => day.value)).toEqual([0, 0, 0, 0, 0, 0, 1200]);
    expect(calories.average).toBeCloseTo(171.43, 1);
  });

  it('ignores logs outside the window and returns nothing without goals', () => {
    const behavior = makeBehavior([{ date: '2026-10-01', kcal: 9999 }]);
    const [calories] = getWeeklyGoalSummaries([behavior], [category], '2026-11-09', '2026-11-10');
    expect(calories.average).toBe(0);
    const noGoals: Category = { ...category, metadataFields: [{ key: 'fat', label: 'Fat' }] };
    expect(getWeeklyGoalSummaries([behavior], [noGoals], '2026-11-09', '2026-11-10')).toEqual([]);
  });
});
