import type { MetadataField } from '../src/types/behavior';
import {
  evaluateDecimalInput,
  getOrderedMetadataFields,
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

describe('metadata ordering', () => {
  it('uses the saved order and appends new fields', () => {
    const fields: MetadataField[] = [
      { key: 'protein', label: 'Protein' },
      { key: 'fiber', label: 'Fiber' },
      { key: 'salt', label: 'Salt' },
    ];

    expect(getOrderedMetadataFields(fields, ['salt', 'protein']).map(field => field.key)).toEqual([
      'salt',
      'protein',
      'fiber',
    ]);
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
