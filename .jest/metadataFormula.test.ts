import type { MetadataField } from '../src/types/behavior';
import {
  applyFormulaValues,
  evaluateFormula,
  findFormulaUsingField,
  formulaToEditText,
  getActiveFormulaFields,
  getBaseUnitsSummary,
  getFormulaCandidateFields,
  getFormulaFieldKeys,
  getPendingFormulaLabels,
  isLogFormulaValueTyped,
  parseFormulaText,
  resolveMetadataFieldUnits,
} from '../src/utils/metadata-formula-utils';

const weight: MetadataField = { key: 'w', label: 'Weight', unit: 'g', calculation: 'amount', formula: '{b} - {a}' };
const volume: MetadataField = { key: 'v', label: 'Volume', unit: 'ml', calculation: 'amount', formula: '{b} - {a}' };
const before: MetadataField = { key: 'b', label: 'Before', unit: 'g', unitFromBase: true };
const after: MetadataField = { key: 'a', label: 'After', unit: 'g', unitFromBase: true };
const kcal: MetadataField = { key: 'k', label: 'Calories', calculation: 'per100' };
const fields = [weight, volume, before, after, kcal];

describe('parseFormulaText', () => {
  const candidates = getFormulaCandidateFields(fields, weight);

  it('stores labels as field keys', () => {
    const parsed = parseFormulaText('Before - After', candidates);
    expect(parsed).toMatchObject({ ok: true, formula: '{b} - {a}' });
  });

  it('accepts phone symbols, brackets, numbers and any case', () => {
    expect(parseFormulaText('(before − AFTER) × 2 ÷ 4', candidates)).toMatchObject({
      ok: true,
      formula: '({b} - {a}) * 2 / 4',
    });
  });

  it('prefers the longest matching label', () => {
    const vit: MetadataField = { key: 'v1', label: 'Vitamin' };
    const vitC: MetadataField = { key: 'v2', label: 'Vitamin C' };
    expect(parseFormulaText('Vitamin C + Vitamin', [vit, vitC])).toMatchObject({ formula: '{v2} + {v1}' });
  });

  it('reports unknown words and unfinished formulas', () => {
    expect(parseFormulaText('Before - Leftover', candidates)).toMatchObject({
      ok: false,
      error: 'No field called "Leftover"',
    });
    expect(parseFormulaText('Before -', candidates)).toMatchObject({ ok: false, error: 'Formula is not finished' });
    expect(parseFormulaText('2 + 3', candidates)).toMatchObject({ ok: false, error: 'Use at least one field' });
  });

  it('clears the formula when empty', () => {
    expect(parseFormulaText('  ', candidates)).toEqual({ ok: true, formula: undefined, tokens: [] });
  });

  it('round-trips through the edit text', () => {
    expect(formulaToEditText('({b} - {a}) * 2', fields)).toBe('(Before - After) * 2');
  });
});

describe('candidates and loops', () => {
  it('only offers Manual fields without their own formula', () => {
    const net: MetadataField = { key: 'n', label: 'Net', formula: '{b} - {a}' };
    expect(getFormulaCandidateFields([...fields, net], weight).map(f => f.key)).toEqual(['b', 'a']);
  });

  it('finds the formula that uses a field', () => {
    expect(findFormulaUsingField(fields, 'b')?.key).toBe('w');
    expect(findFormulaUsingField(fields, 'k')).toBeUndefined();
  });
});

describe('evaluateFormula', () => {
  it('works out Before - After', () => {
    expect(evaluateFormula('{b} - {a}', { b: '350', a: 170 })).toEqual({ result: 180, missingKeys: [] });
  });

  it('lists missing fields', () => {
    expect(evaluateFormula('{b} - {a}', { b: '350', a: '' })).toEqual({ missingKeys: ['a'] });
  });

  it('does not fill a negative result or a division by zero', () => {
    expect(evaluateFormula('{b} - {a}', { b: 100, a: 170 }).error).toBe('negative');
    expect(evaluateFormula('{b} / {a}', { b: 100, a: 0 }).error).toBe('divide');
  });

  it('respects precedence and unary minus', () => {
    expect(evaluateFormula('{b} - {a} * 2', { b: 10, a: 3 }).result).toBe(4);
    expect(evaluateFormula('-{a} + {b}', { b: 10, a: 3 }).result).toBe(7);
  });
});

describe('log form', () => {
  it('shows only the selected Base formula', () => {
    expect(getActiveFormulaFields(fields, volume).map(f => f.key)).toEqual(['v']);
    expect(getActiveFormulaFields(fields, volume, true)).toEqual([]);
  });

  it('fills the formula in formula mode', () => {
    expect(applyFormulaValues({ w: '100', b: '350', a: '170' }, [weight], [])).toEqual({
      w: '180',
      b: '350',
      a: '170',
    });
    expect(applyFormulaValues({ w: '100', b: '350' }, [weight], [])).toEqual({ w: '', b: '350' });
  });

  it('keeps a typed value and drops the stale inputs', () => {
    expect(applyFormulaValues({ w: '200', b: '350', a: '170' }, [weight], ['w'])).toEqual({ w: '200' });
  });

  it('tells typed logs apart from formula logs', () => {
    expect(isLogFormulaValueTyped(weight, { w: 180, b: 350, a: 170 })).toBe(false);
    expect(isLogFormulaValueTyped(weight, { w: 200, b: 350, a: 170 })).toBe(true);
    expect(isLogFormulaValueTyped(weight, { w: 200 })).toBe(true);
    expect(isLogFormulaValueTyped(weight, { b: 350 })).toBe(false);
  });

  it('marks a log that still needs After', () => {
    expect(getPendingFormulaLabels(fields, weight, { b: 350 })).toEqual(['After']);
    expect(getPendingFormulaLabels(fields, weight, { b: 350, a: 170, w: 180 })).toEqual([]);
    expect(getPendingFormulaLabels(fields, weight, { w: 120 })).toEqual([]);
  });
});

describe('unit from Base', () => {
  it('uses the behaviour Base unit', () => {
    const resolved = resolveMetadataFieldUnits(fields, volume);
    expect(resolved.find(f => f.key === 'b')?.unit).toBe('ml');
    expect(resolveMetadataFieldUnits(fields, undefined).find(f => f.key === 'a')?.unit).toBeUndefined();
  });

  it('summarises Base units for the editor', () => {
    expect(getBaseUnitsSummary(fields)).toBe('g · ml');
  });

  it('lists formula field keys once', () => {
    expect(getFormulaFieldKeys('{b} - {a} + {b}')).toEqual(['b', 'a']);
  });
});
