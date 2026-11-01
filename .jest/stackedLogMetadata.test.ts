import type { BehaviorEntry, MetadataField } from '../src/types/behavior';
import {
  buildLogMetadata,
  getBehaviorMetadataFields,
  getInitialLogMetadataValues,
} from '../src/utils/metadata-calculation-utils';

const amountField: MetadataField = { key: 'amount', label: 'Amount', calculation: 'amount', unit: 'g' };
const fields: MetadataField[] = [
  amountField,
  { key: 'protein', label: 'Protein', calculation: 'per100', unit: 'g' },
  { key: 'fiber', label: 'Fiber' },
];

describe('log form metadata', () => {
  it('starts from the behaviour defaults for amount and manual fields only', () => {
    expect(getInitialLogMetadataValues(fields, amountField, { amount: 50, protein: 20, fiber: 3 })).toEqual({
      amount: '50',
      fiber: '3',
    });
    expect(getInitialLogMetadataValues(fields, amountField, undefined)).toEqual({});
  });

  it('builds saved metadata with notes and per-100 fields calculated from the amount', () => {
    expect(
      buildLogMetadata({
        fields,
        amountField,
        values: { amount: '150', fiber: '2' },
        defaultMetadata: { protein: 20 },
        notes: '  after run ',
      }),
    ).toEqual({ notes: 'after run', amount: 150, fiber: 2, protein: 30 });
  });

  it('returns undefined when nothing was entered', () => {
    expect(buildLogMetadata({ fields, amountField, values: {}, notes: ' ' })).toBeUndefined();
  });

  it('finds the metadata fields of a stacked behaviour through its category', () => {
    const behavior = { id: 'b', categoryId: 'food' } as BehaviorEntry;
    expect(getBehaviorMetadataFields(behavior, [{ id: 'food', metadataFields: fields }])).toBe(fields);
    expect(getBehaviorMetadataFields({ ...behavior, categoryId: undefined }, [])).toEqual([]);
  });
});
