import type { MetadataField } from '../src/types/behavior';
import {
  evaluateDecimalInput,
  getOrderedMetadataFields,
  parseDecimalInput,
  sanitizeDecimalInput,
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
