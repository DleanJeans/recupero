import type { LogEntry, MetadataField } from '../types/behavior';
import { getMetadataFieldCalculation, isLinkMetadataField, parseDecimalInput } from './metadata-calculation-utils';
import { roundTo2 } from './number-utils';

/**
 * Formula fields (e.g. Weight = Before - After). A formula is stored as text with field keys in braces,
 * "{field_1} - {field_2}", so renaming a field never breaks it. The editor shows field labels instead.
 * Only Manual number fields without a formula of their own can be used in one, so formulas never chain or loop.
 */

export type FormulaOperator = '+' | '-' | '*' | '/' | '(' | ')';

export type FormulaToken =
  | { type: 'number'; value: number; text: string }
  | { type: 'operator'; operator: FormulaOperator }
  | { type: 'field'; key: string };

const OPERATORS = new Set<string>(['+', '-', '*', '/', '(', ')']);
/** Typed symbols that mean the same operator (× ÷ − from a phone keyboard, x for times). */
const OPERATOR_ALIASES: Record<string, FormulaOperator> = { '×': '*', x: '*', X: '*', '÷': '/', '−': '-', '–': '-' };

export const FORMULA_OPERATOR_SYMBOLS: Record<FormulaOperator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  '(': '(',
  ')': ')',
};

function readNumber(text: string, start: number): { value: number; text: string; end: number } | undefined {
  const match = /^\d+(?:\.\d*)?|^\.\d+/.exec(text.slice(start));
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? { value, text: match[0], end: start + match[0].length } : undefined;
}

/** Splits a stored formula ("{a} - {b} * 2") into tokens. Undefined when it holds anything else. */
export function tokenizeStoredFormula(formula: string): FormulaToken[] | undefined {
  const tokens: FormulaToken[] = [];
  let i = 0;
  while (i < formula.length) {
    const char = formula[i];
    if (/\s/.test(char)) {
      i++;
    } else if (char === '{') {
      const end = formula.indexOf('}', i);
      if (end < 0) return undefined;
      tokens.push({ type: 'field', key: formula.slice(i + 1, end) });
      i = end + 1;
    } else if (OPERATORS.has(char)) {
      tokens.push({ type: 'operator', operator: char as FormulaOperator });
      i++;
    } else {
      const number = readNumber(formula, i);
      if (!number) return undefined;
      tokens.push({ type: 'number', value: number.value, text: number.text });
      i = number.end;
    }
  }
  return tokens;
}

export function serializeFormulaTokens(tokens: FormulaToken[]): string {
  return tokens
    .map(token => (token.type === 'field' ? `{${token.key}}` : token.type === 'number' ? token.text : token.operator))
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
}

/** Keys of the fields a formula uses, in order, without repeats. */
export function getFormulaFieldKeys(formula: string | undefined): string[] {
  if (!formula) return [];
  const keys: string[] = [];
  for (const token of tokenizeStoredFormula(formula) ?? []) {
    if (token.type === 'field' && !keys.includes(token.key)) keys.push(token.key);
  }
  return keys;
}

type ParseResult = { ok: true; value: number } | { ok: false; reason: 'invalid' | 'divide' };

/** Recursive-descent evaluation with + - * / ( ) and unary minus. */
function evaluateTokens(tokens: FormulaToken[], valueOf: (key: string) => number): ParseResult {
  let pos = 0;
  let failure: 'invalid' | 'divide' | undefined;
  const peekOperator = () => {
    const token = tokens[pos];
    return token?.type === 'operator' ? token.operator : undefined;
  };
  const primary = (): number => {
    const token = tokens[pos];
    if (!token) {
      failure ??= 'invalid';
      return 0;
    }
    pos++;
    if (token.type === 'number') return token.value;
    if (token.type === 'field') return valueOf(token.key);
    if (token.operator === '-') return -primary();
    if (token.operator === '+') return primary();
    if (token.operator === '(') {
      const value = sum();
      if (peekOperator() !== ')') failure ??= 'invalid';
      else pos++;
      return value;
    }
    failure ??= 'invalid';
    return 0;
  };
  const product = (): number => {
    let value = primary();
    for (let op = peekOperator(); op === '*' || op === '/'; op = peekOperator()) {
      pos++;
      const right = primary();
      if (op === '*') value *= right;
      else if (right === 0) failure ??= 'divide';
      else value /= right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    for (let op = peekOperator(); op === '+' || op === '-'; op = peekOperator()) {
      pos++;
      const right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };
  if (tokens.length === 0) return { ok: false, reason: 'invalid' };
  const value = sum();
  if (pos < tokens.length) failure ??= 'invalid';
  if (failure) return { ok: false, reason: failure };
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: 'invalid' };
}

export interface FormulaEvaluation {
  /** The value to fill in. Undefined while a field is missing, or when the result is below 0 or can't be worked out. */
  result?: number;
  /** Fields the formula uses that have no value yet. */
  missingKeys: string[];
  /** Why there is no result even though every field has a value. */
  error?: 'negative' | 'divide' | 'invalid';
}

/** Works a formula out from the log's values (typed text or saved numbers). Results below 0 are not filled in. */
export function evaluateFormula(
  formula: string,
  values: Record<string, string | number | undefined> | undefined,
): FormulaEvaluation {
  const tokens = tokenizeStoredFormula(formula);
  if (!tokens) return { missingKeys: [], error: 'invalid' };
  const numbers: Record<string, number> = {};
  const missingKeys: string[] = [];
  for (const key of getFormulaFieldKeys(formula)) {
    const raw = values?.[key];
    const value = typeof raw === 'number' ? (Number.isFinite(raw) ? raw : undefined) : parseDecimalInput(raw ?? '');
    if (value == null) missingKeys.push(key);
    else numbers[key] = value;
  }
  if (missingKeys.length > 0) return { missingKeys };
  const parsed = evaluateTokens(tokens, key => numbers[key] ?? 0);
  if (!parsed.ok) return { missingKeys, error: parsed.reason };
  const result = roundTo2(parsed.value);
  if (result < 0) return { missingKeys, error: 'negative' };
  return { result, missingKeys };
}

/** Fields that can be used inside `field`'s formula: Manual number fields without a formula of their own. */
export function getFormulaCandidateFields(fields: MetadataField[], field: MetadataField): MetadataField[] {
  return fields.filter(
    other =>
      other.key !== field.key &&
      !isLinkMetadataField(other) &&
      getMetadataFieldCalculation(other) === 'manual' &&
      !other.formula?.trim(),
  );
}

/** Whether a field may have a formula: a Base or Manual number field. */
export function canFieldHaveFormula(field: MetadataField): boolean {
  if (isLinkMetadataField(field)) return false;
  const calculation = getMetadataFieldCalculation(field);
  return calculation === 'manual' || calculation === 'amount';
}

/** The field's formula when it is usable: a Base or Manual number field with a formula that parses. */
export function getFieldFormula(field: MetadataField): string | undefined {
  const formula = field.formula?.trim();
  if (!formula || !canFieldHaveFormula(field)) return undefined;
  return tokenizeStoredFormula(formula) ? formula : undefined;
}

/** The field whose formula uses `key`, if any (such a field can't get a formula itself). */
export function findFormulaUsingField(fields: MetadataField[], key: string): MetadataField | undefined {
  return fields.find(field => field.key !== key && getFormulaFieldKeys(getFieldFormula(field)).includes(key));
}

/** Shows a stored formula with field labels, e.g. "Before - After", for editing. */
export function formulaToEditText(formula: string | undefined, fields: MetadataField[]): string {
  if (!formula) return '';
  const tokens = tokenizeStoredFormula(formula);
  if (!tokens) return formula;
  return tokens
    .map(token => {
      if (token.type === 'number') return token.text;
      if (token.type === 'operator') return token.operator;
      return fields.find(field => field.key === token.key)?.label.trim() || '?';
    })
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
}

export type FormulaTextParse =
  | { ok: true; formula: string | undefined; tokens: FormulaToken[] }
  | { ok: false; error: string; tokens: FormulaToken[] };

/**
 * Reads a formula typed with field labels ("Before - After", "(Gross - Fee) * 2") and stores it with field keys.
 * Labels match case-insensitively, longest first, so "Vitamin C" wins over "Vitamin". Empty text clears the formula.
 */
export function parseFormulaText(text: string, candidates: MetadataField[]): FormulaTextParse {
  const tokens: FormulaToken[] = [];
  const named = candidates
    .map(field => ({ field, label: field.label.trim().toLowerCase() }))
    .filter(item => item.label.length > 0)
    .sort((a, b) => b.label.length - a.label.length);
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    const operator = OPERATORS.has(char) ? (char as FormulaOperator) : OPERATOR_ALIASES[char];
    const fieldMatch = named.find(item => lower.startsWith(item.label, i));
    if (fieldMatch) {
      tokens.push({ type: 'field', key: fieldMatch.field.key });
      i += fieldMatch.label.length;
      continue;
    }
    if (operator) {
      tokens.push({ type: 'operator', operator });
      i++;
      continue;
    }
    const number = readNumber(text, i);
    if (number) {
      tokens.push({ type: 'number', value: number.value, text: number.text });
      i = number.end;
      continue;
    }
    const word = /^[^+\-*/()×÷−–]+/.exec(text.slice(i))?.[0].trim() ?? char;
    return { ok: false, error: `No field called "${word}"`, tokens };
  }
  if (tokens.length === 0) return { ok: true, formula: undefined, tokens };
  const check = evaluateTokens(tokens, () => 1);
  if (!check.ok && check.reason === 'invalid') return { ok: false, error: 'Formula is not finished', tokens };
  if (!tokens.some(token => token.type === 'field')) return { ok: false, error: 'Use at least one field', tokens };
  return { ok: true, formula: serializeFormulaTokens(tokens), tokens };
}

/**
 * Formula fields the log form shows: the behaviour's Base field (unless its amount is "None") and Manual fields.
 * Other Base fields are hidden in the form, so their formulas don't apply.
 */
export function getActiveFormulaFields(
  fields: MetadataField[],
  amountField: MetadataField | undefined,
  amountOptedOut = false,
): MetadataField[] {
  return fields.filter(field => {
    if (!getFieldFormula(field)) return false;
    if (getMetadataFieldCalculation(field) === 'amount') return !amountOptedOut && field.key === amountField?.key;
    return true;
  });
}

/** Fields used by the given formulas. The log form shows them inside the formula row instead of on their own. */
export function getFormulaInputKeys(formulaFields: MetadataField[]): Set<string> {
  return new Set(formulaFields.flatMap(field => getFormulaFieldKeys(getFieldFormula(field))));
}

/**
 * Log form values with formulas applied. A formula field in formula mode gets its result ('' while a field is
 * missing); one the user typed keeps the typed value, and that formula's inputs are dropped so stale numbers
 * don't get saved with it.
 */
export function applyFormulaValues(
  values: Record<string, string>,
  formulaFields: MetadataField[],
  typedKeys: readonly string[],
): Record<string, string> {
  if (formulaFields.length === 0) return values;
  const next = { ...values };
  const typed = formulaFields.filter(field => typedKeys.includes(field.key));
  const usedByFormulaMode = new Set(
    formulaFields
      .filter(field => !typedKeys.includes(field.key))
      .flatMap(field => getFormulaFieldKeys(getFieldFormula(field))),
  );
  for (const field of typed) {
    for (const key of getFormulaFieldKeys(getFieldFormula(field))) {
      if (!usedByFormulaMode.has(key)) delete next[key];
    }
  }
  for (const field of formulaFields) {
    if (typedKeys.includes(field.key)) continue;
    const formula = getFieldFormula(field);
    if (!formula) continue;
    const { result } = evaluateFormula(formula, values);
    next[field.key] = result == null ? '' : String(result);
  }
  return next;
}

/** Whether an existing log's value came from typing rather than its formula (opens the form in Type mode). */
export function isLogFormulaValueTyped(field: MetadataField, metadata: LogEntry['metadata']): boolean {
  const formula = getFieldFormula(field);
  const saved = metadata?.[field.key];
  if (!formula || saved == null || saved === '') return false;
  const { result } = evaluateFormula(formula, metadata);
  return result == null || Number(saved) !== result;
}

/** Labels of the formula inputs a log still needs, e.g. ["After"] when only Before was weighed. Empty when the
 *  log is complete, was typed, or has none of the inputs. */
export function getPendingFormulaLabels(
  fields: MetadataField[],
  amountField: MetadataField | undefined,
  metadata: LogEntry['metadata'],
): string[] {
  if (!metadata) return [];
  const labels: string[] = [];
  for (const field of getActiveFormulaFields(fields, amountField)) {
    const saved = metadata[field.key];
    if (saved != null && saved !== '') continue;
    const formula = getFieldFormula(field);
    if (!formula) continue;
    const keys = getFormulaFieldKeys(formula);
    const { missingKeys } = evaluateFormula(formula, metadata);
    if (missingKeys.length === 0 || missingKeys.length === keys.length) continue;
    for (const key of missingKeys) {
      const label = fields.find(item => item.key === key)?.label;
      if (label && !labels.includes(label)) labels.push(label);
    }
  }
  return labels;
}

/** Fields with "Unit from Base" get the unit of the behaviour's Base field (or no unit when it has none). */
export function resolveMetadataFieldUnits(
  fields: MetadataField[],
  amountField: MetadataField | undefined,
): MetadataField[] {
  if (!fields.some(field => field.unitFromBase)) return fields;
  return fields.map(field => (field.unitFromBase ? { ...field, unit: amountField?.unit || undefined } : field));
}

/** Units of a category's Base fields, e.g. "g · ml", for a "Unit from Base" field in the category editor. */
export function getBaseUnitsSummary(fields: MetadataField[]): string {
  const units: string[] = [];
  for (const field of fields) {
    const unit = field.unit?.trim();
    if (getMetadataFieldCalculation(field) === 'amount' && unit && !units.includes(unit)) units.push(unit);
  }
  return units.join(' · ');
}

/** Formula fields that start in Manual (typed) mode: an edited log opens the way it was saved, a new one the way the
 *  behaviour was last logged (Manual when it was never chosen). */
export function getInitialTypedFormulaKeys(
  formulaFields: MetadataField[],
  rememberedTypedKeys: readonly string[] | undefined,
  existingMetadata?: LogEntry['metadata'],
): string[] {
  return formulaFields
    .filter(field =>
      existingMetadata
        ? isLogFormulaValueTyped(field, existingMetadata)
        : rememberedTypedKeys == null || rememberedTypedKeys.includes(field.key),
    )
    .map(field => field.key);
}

/** Switching to Type starts from the formula's result, so it can be nudged instead of retyped. */
export function setFormulaFieldTyped(
  state: { typedKeys: string[]; values: Record<string, string> },
  formulaFields: MetadataField[],
  key: string,
  typed: boolean,
): { typedKeys: string[]; values: Record<string, string> } {
  const typedKeys = typed
    ? state.typedKeys.includes(key)
      ? state.typedKeys
      : [...state.typedKeys, key]
    : state.typedKeys.filter(item => item !== key);
  if (!typed) return { typedKeys, values: state.values };
  const field = formulaFields.find(item => item.key === key);
  const result = field ? evaluateFormula(getFieldFormula(field) ?? '', state.values).result : undefined;
  return { typedKeys, values: result == null ? state.values : { ...state.values, [key]: String(result) } };
}

/** The behaviour's remembered Manual-mode keys after a save, or `null` when nothing changed. Undefined (never
 *  chosen) means Manual, so the first save always stores the choice, even an empty list (= Formula everywhere). */
export function getNextRememberedTypedKeys(
  formulaFields: MetadataField[],
  rememberedTypedKeys: readonly string[] | undefined,
  typedKeys: readonly string[],
): string[] | null {
  if (formulaFields.length === 0) return null;
  const formulaKeys = new Set(formulaFields.map(field => field.key));
  const kept = (rememberedTypedKeys ?? []).filter(key => !formulaKeys.has(key));
  const next = [...kept, ...typedKeys.filter(key => formulaKeys.has(key))].sort();
  const previous = [...(rememberedTypedKeys ?? [])].sort();
  if (rememberedTypedKeys != null && next.join(',') === previous.join(',')) return null;
  return next;
}

export interface FormulaState {
  formulaFields: MetadataField[];
  /** Fields a formula uses: typed inside the formula's row instead of on their own. */
  inputKeys: Set<string>;
  /** Values to save and to calculate from: the typed ones with formula results filled in. */
  effectiveValues: Record<string, string>;
}

/** Everything a log form (the main one or a stacked behaviour's card) needs to show and save formula fields. */
export function resolveFormulaState(params: {
  fields: MetadataField[];
  amountField: MetadataField | undefined;
  amountOptedOut: boolean;
  values: Record<string, string>;
  typedKeys: readonly string[];
}): FormulaState {
  const formulaFields = getActiveFormulaFields(params.fields, params.amountField, params.amountOptedOut);
  return {
    formulaFields,
    inputKeys: getFormulaInputKeys(formulaFields),
    effectiveValues: applyFormulaValues(params.values, formulaFields, params.typedKeys),
  };
}
