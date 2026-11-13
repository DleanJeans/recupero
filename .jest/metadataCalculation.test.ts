import type { MetadataField } from '../src/types/behavior';
import {
  buildCalculatedMetadata,
  buildLogMetadata,
  evaluateDecimalInput,
  formatMetadataAmountBasis,
  getMetadataRateBasis,
  parseDecimalInput,
  sanitizeDecimalInput,
  syncBehaviorLogMetadata,
} from '../src/utils/metadata-calculation-utils';

describe('metadata decimal input', () => {
  it('evaluates subtraction expressions', () => {
    expect(sanitizeDecimalInput('100 - 20.5')).toBe('100-20.5');
    expect(evaluateDecimalInput('100 - 20.5')).toBe('79.5');
    expect(parseDecimalInput('100-20-5')).toBe(75);
  });

  it('keeps incomplete expressions editable', () => {
    expect(evaluateDecimalInput('100-')).toBe('100-');
    expect(parseDecimalInput('100-')).toBeUndefined();
  });
});

describe('behavior log metadata synchronization', () => {
  it('updates manual defaults and recalculates per-100 fields while keeping notes', () => {
    const amountField: MetadataField = { key: 'amount', label: 'Amount', calculation: 'amount', unit: 'g' };
    const fields: MetadataField[] = [
      amountField,
      { key: 'protein', label: 'Protein', calculation: 'per100', unit: 'g' },
      { key: 'fiber', label: 'Fiber' },
    ];

    expect(
      syncBehaviorLogMetadata({
        metadata: { amount: 250, protein: 20, notes: 'breakfast' },
        fields,
        previousDefaultMetadata: { protein: 20 },
        defaultMetadata: { protein: 30, fiber: 6 },
        amountField,
      }),
    ).toEqual({ amount: 250, protein: 75, fiber: 6, notes: 'breakfast' });
  });
});

describe('custom rate basis', () => {
  const fields: MetadataField[] = [
    { key: 'amount', label: 'Weight', unit: 'g', calculation: 'amount' },
    { key: 'kcal', label: 'Calories', unit: 'kcal', calculation: 'per100' },
  ];
  const amountField = fields[0];

  it('defaults to per 100 when no basis is set', () => {
    expect(getMetadataRateBasis({})).toBe(100);
    expect(getMetadataRateBasis({ metadataRateBasis: 0 })).toBe(100);
    expect(buildCalculatedMetadata(fields, { kcal: 200 }, 50)).toEqual({ kcal: 100 });
    expect(formatMetadataAmountBasis(amountField)).toBe('100g');
  });

  it('scales rates given per portion', () => {
    expect(buildCalculatedMetadata(fields, { kcal: 120 }, 45, 30)).toEqual({ kcal: 180 });
    expect(formatMetadataAmountBasis(amountField, 30)).toBe('30g');
    expect(
      buildLogMetadata({
        fields,
        amountField,
        values: { amount: '15' },
        defaultMetadata: { kcal: 120 },
        rateBasis: 30,
      }),
    ).toEqual({ amount: 15, kcal: 60 });
  });

  it('recalculates logs when synced with a new basis', () => {
    expect(
      syncBehaviorLogMetadata({
        metadata: { amount: 30, kcal: 36 },
        fields,
        previousDefaultMetadata: { kcal: 120 },
        defaultMetadata: { kcal: 120 },
        amountField,
        rateBasis: 30,
      }),
    ).toEqual({ amount: 30, kcal: 120 });
  });
});
