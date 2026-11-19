import type { BehaviorEntry, Category } from '../src/types/behavior';
import {
  buildBatchName,
  getBatchRates,
  getBatchStatus,
  getLeftoverAdjustment,
  getPortionValues,
  getSuggestedPortionAmount,
  stripBatchNameDate,
  sumBatchTotals,
  syncBatchIngredientLogs,
} from '../src/utils/meal-batch-utils';

const fields = [
  { key: 'amt', label: 'Amount', unit: 'g', calculation: 'amount' as const },
  { key: 'kcal', label: 'Calorie', unit: 'kcal', calculation: 'per100' as const },
  { key: 'p', label: 'Protein', unit: 'g', calculation: 'per100' as const },
];
const categories: Category[] = [{ id: 'food', name: 'Food', emoji: '🍽️', metadataFields: fields }];
const food = (
  id: string,
  kcal: number,
  p: number,
  basis?: number,
  extra: Partial<BehaviorEntry> = {},
): BehaviorEntry => ({
  id,
  name: id,
  type: 'neutral',
  categoryId: 'food',
  lastTimestamp: null,
  metadata: {},
  defaultMetadata: { kcal, p },
  metadataRateBasis: basis,
  logs: [],
  cooldownMinutes: 0,
  ...extra,
});

describe('meal batch maths', () => {
  const chicken = food('chicken', 120, 22.5);
  const rice = food('rice', 108, 2.1, 30); // per 30 g: 360 kcal / 100 g

  it('scales each ingredient by its own rate basis', () => {
    const totals = sumBatchTotals(fields, [
      { behavior: chicken, amount: 500 },
      { behavior: rice, amount: 200 },
    ]);
    expect(totals.kcal).toBeCloseTo(600 + 720);
    expect(totals.p).toBeCloseTo(112.5 + 14);
  });

  it('turns totals into rates per 100 and per portion', () => {
    const totals = { kcal: 1555, p: 134.4 };
    expect(getBatchRates(totals, 1650).kcal).toBeCloseTo(94.2424, 3);
    expect(getBatchRates(totals, 1650, 30).kcal).toBeCloseTo(28.2727, 3);
    expect(getPortionValues(totals, 1650, 380).kcal).toBe(358.12);
  });

  it('ignores bad amounts', () => {
    expect(sumBatchTotals(fields, [{ behavior: chicken, amount: 0 }])).toEqual({});
    expect(getBatchRates({ kcal: 10 }, 0)).toEqual({});
  });

  it('reports leftovers from logged amounts', () => {
    const batch = food('b', 1, 1, undefined, {
      metadataAmountFieldKey: 'amt',
      batch: { ingredients: [], cookedAmount: 1650, cookedAt: 0 },
      logs: [
        { id: '1', timestamp: 1, metadata: { amt: 380 } },
        { id: '2', timestamp: 2, metadata: { amt: 400 } },
      ],
    });
    expect(getBatchStatus(batch, categories)).toMatchObject({ eaten: 780, left: 870, portions: 2, unit: 'g' });
    expect(getBatchStatus(food('x', 1, 1), categories)).toBeNull();
  });

  it('suggests a portion size and names batches', () => {
    expect(getSuggestedPortionAmount(1650, 4)).toBe(415);
    expect(getSuggestedPortionAmount(1650, undefined)).toBeUndefined();
    const name = buildBatchName('Chicken rice', new Date(2026, 10, 16).getTime());
    expect(name).toBe('Chicken rice · Nov 16');
    expect(stripBatchNameDate(name)).toBe('Chicken rice');
  });

  it('rescales rates when the leftover shows water evaporated', () => {
    const batch = food('b', 100, 10, undefined, {
      metadataAmountFieldKey: 'amt',
      defaultMetadata: { kcal: 100, p: 10, amt: 400 },
      batch: { ingredients: [], cookedAmount: 1000, cookedAt: 0 },
      logs: [{ id: '1', timestamp: 1, metadata: { amt: 400 } }],
    });
    // 400 eaten + 500 left = 900 g really cooked
    const adjusted = getLeftoverAdjustment(batch, categories, 500);
    expect(adjusted?.cookedAmount).toBe(900);
    expect(adjusted?.defaultMetadata.kcal).toBeCloseTo(111.1111, 3);
    expect(adjusted?.defaultMetadata.amt).toBe(400);
    expect(getLeftoverAdjustment(batch, categories, -1)).toBeNull();
  });
});

describe('syncBatchIngredientLogs', () => {
  const batch = food('pot', 100, 10, undefined, {
    batch: { ingredients: [{ behaviorId: 'rice', name: 'rice', amount: 200 }], cookedAmount: 500, cookedAt: 1000 },
  });
  let n = 0;
  const makeId = () => `id${n++}`;

  it('gives each ingredient one amount-only log, and is idempotent', () => {
    const once = syncBatchIngredientLogs(
      [food('rice', 130, 3, undefined, { metadataAmountFieldKey: 'amt' }), batch],
      categories,
      'pot',
      makeId,
    );
    const twice = syncBatchIngredientLogs(once, categories, 'pot', makeId);
    const rice = twice.find(b => b.id === 'rice');
    expect(rice?.logs).toHaveLength(1);
    expect(rice?.logs[0]).toMatchObject({ batchBehaviorId: 'pot', timestamp: 1000, metadata: { amt: 200 } });
    expect(twice.find(b => b.id === 'pot')?.logs).toHaveLength(0);
  });
});
