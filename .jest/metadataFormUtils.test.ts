import type { BehaviorEntry, MetadataField } from '../src/types/behavior';
import { NO_AMOUNT_FIELD_KEY } from '../src/utils/metadata-calculation-utils';
import {
  buildBehaviorFormMetadata,
  getBehaviorFormFields,
  getBehaviorInitialTypedFormulaKeys,
  getBehaviorRememberedTypedKeys,
  getFormCalculatedValues,
  getStackedTypedFormulaKeys,
  getVisibleMetadataFields,
} from '../src/utils/metadata-form-utils';
import { getNextRememberedTypedKeys, setFormulaFieldTyped } from '../src/utils/metadata-formula-utils';

const weight: MetadataField = { key: 'w', label: 'Weight', unit: 'g', calculation: 'amount', formula: '{b} - {a}' };
const volume: MetadataField = { key: 'v', label: 'Volume', unit: 'ml', calculation: 'amount' };
const before: MetadataField = { key: 'b', label: 'Before', unitFromBase: true };
const after: MetadataField = { key: 'a', label: 'After', unitFromBase: true };
const kcal: MetadataField = { key: 'k', label: 'Calories', calculation: 'per100' };
const fields = [weight, volume, before, after, kcal];

function behavior(overrides: Partial<BehaviorEntry> = {}): BehaviorEntry {
  return {
    id: 'noodles',
    name: 'Pho',
    defaultMetadata: { k: 360 },
    metadataAmountFieldKey: 'w',
    metadataRateBasis: 100,
    logs: [],
    ...overrides,
  } as BehaviorEntry;
}

describe('stacked behaviours use the same metadata rules as the main log', () => {
  it('works a stacked formula out when saving, in formula mode', () => {
    const metadata = buildBehaviorFormMetadata({
      behavior: behavior(),
      categoryFields: fields,
      values: { b: '120', a: '45' },
      typedFormulaKeys: [],
    });
    expect(metadata).toMatchObject({ w: 75, b: 120, a: 45, k: 270 });
  });

  it('keeps a typed weight and drops the unused Before/After', () => {
    const metadata = buildBehaviorFormMetadata({
      behavior: behavior(),
      categoryFields: fields,
      values: { w: '75', b: '120', a: '45' },
      typedFormulaKeys: ['w'],
    });
    expect(metadata).toEqual({ w: 75, k: 270 });
  });

  it('opens in Manual until a choice was remembered, then follows it', () => {
    expect(getBehaviorInitialTypedFormulaKeys(behavior(), fields)).toEqual(['w']);
    expect(getBehaviorInitialTypedFormulaKeys(behavior({ metadataTypedFormulaKeys: [] }), fields)).toEqual([]);
    expect(getBehaviorInitialTypedFormulaKeys(behavior({ metadataTypedFormulaKeys: ['w'] }), fields)).toEqual(['w']);
  });

  it("a stacked log's own choice wins over the remembered one", () => {
    const stacked = { behaviorId: 'noodles', metadataValues: {}, typedFormulaKeys: [] };
    expect(getStackedTypedFormulaKeys(stacked, behavior(), fields)).toEqual([]);
    expect(getStackedTypedFormulaKeys({ ...stacked, typedFormulaKeys: undefined }, behavior(), fields)).toEqual(['w']);
  });

  it('remembers the first choice even when it is Formula everywhere', () => {
    expect(getBehaviorRememberedTypedKeys(behavior(), fields, [])).toEqual([]);
    expect(getBehaviorRememberedTypedKeys(behavior({ metadataTypedFormulaKeys: [] }), fields, [])).toBeNull();
    expect(getBehaviorRememberedTypedKeys(behavior({ metadataTypedFormulaKeys: [] }), fields, ['w'])).toEqual(['w']);
    expect(getNextRememberedTypedKeys([], undefined, [])).toBeNull();
  });

  it('switching to Manual starts from the formula result', () => {
    const next = setFormulaFieldTyped({ typedKeys: [], values: { b: '120', a: '45' } }, [weight], 'w', true);
    expect(next).toEqual({ typedKeys: ['w'], values: { b: '120', a: '45', w: '75' } });
    expect(setFormulaFieldTyped(next, [weight], 'w', false).typedKeys).toEqual([]);
  });

  it('follows the behaviour Base unit and hides amount fields when opted out', () => {
    const volumeBehavior = behavior({ metadataAmountFieldKey: 'v' });
    expect(getBehaviorFormFields(volumeBehavior, fields).fields.find(f => f.key === 'b')?.unit).toBe('ml');
    const none = behavior({ metadataAmountFieldKey: NO_AMOUNT_FIELD_KEY });
    const { fields: resolved, amountOptedOut } = getBehaviorFormFields(none, fields);
    expect(amountOptedOut).toBe(true);
    expect(getVisibleMetadataFields(resolved, amountOptedOut).map(f => f.key)).toEqual(['b', 'a']);
  });

  it('calculates per-amount values from the worked-out amount', () => {
    const { amountField } = getBehaviorFormFields(behavior(), fields);
    expect(
      getFormCalculatedValues({
        fields,
        amountField,
        values: { w: '75' },
        defaultMetadata: { k: 360 },
        rateBasis: 100,
      }),
    ).toEqual({ k: 270 });
    expect(
      getFormCalculatedValues({ fields, amountField, values: { w: '' }, defaultMetadata: { k: 360 }, rateBasis: 100 }),
    ).toEqual({});
  });
});
