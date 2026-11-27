import type { BehaviorEntry, LogEntry, MetadataField } from '../types/behavior';
import {
  buildCalculatedMetadata,
  buildLogMetadata,
  type DailyGoalProgress,
  getBehaviorAmountField,
  getDailyGoalProgress,
  getManualMetadataFields,
  isLinkMetadataField,
  NO_AMOUNT_FIELD_KEY,
  parseDecimalInput,
  type StackedLog,
} from './metadata-calculation-utils';
import {
  getInitialTypedFormulaKeys,
  getNextRememberedTypedKeys,
  resolveFormulaState,
  resolveMetadataFieldUnits,
} from './metadata-formula-utils';

/**
 * Everything that decides which metadata inputs a behaviour's log shows and what gets saved from them.
 * The main log form and every stacked behaviour's card go through these, so a change to how metadata fields
 * work (new type, formula, unit rule) is made once here and in BehaviorMetadataFields, never per screen.
 */

export interface BehaviorFormFields {
  /** The category's fields with "Unit from Base" resolved for this behaviour. */
  fields: MetadataField[];
  amountField: MetadataField | undefined;
  /** "None" amount unit: the amount and per-amount fields can't be filled or calculated, so they are hidden. */
  amountOptedOut: boolean;
}

export function getBehaviorFormFields(
  behavior: Pick<BehaviorEntry, 'metadataAmountFieldKey' | 'metadataQuantityUnit'>,
  categoryFields: MetadataField[],
): BehaviorFormFields {
  const amountField = getBehaviorAmountField(behavior as BehaviorEntry, categoryFields);
  return {
    fields: resolveMetadataFieldUnits(categoryFields, amountField),
    amountField,
    amountOptedOut: behavior.metadataAmountFieldKey === NO_AMOUNT_FIELD_KEY,
  };
}

/** The fields the log form lists (the behaviour's own Base field is picked later, in BehaviorMetadataFields). */
export function getVisibleMetadataFields(fields: MetadataField[], amountOptedOut: boolean): MetadataField[] {
  return amountOptedOut
    ? fields.filter(field => isLinkMetadataField(field) || getManualMetadataFields([field]).length > 0)
    : fields;
}

/** Per-amount ("Calculated") values for the amount currently in the form. Empty until an amount is entered. */
export function getFormCalculatedValues(params: {
  fields: MetadataField[];
  amountField: MetadataField | undefined;
  /** Values with formula results already applied. */
  values: Record<string, string>;
  defaultMetadata: Record<string, number> | undefined;
  rateBasis: number | undefined;
}): Record<string, number> {
  if (!params.amountField) return {};
  const amountValue = params.values[params.amountField.key];
  if (amountValue === undefined || amountValue === '') return {};
  return buildCalculatedMetadata(
    params.fields,
    params.defaultMetadata,
    parseDecimalInput(amountValue),
    params.rateBasis,
  );
}

/** Metadata saved for one behaviour's log: formula results applied, then the usual per-field rules. */
export function buildBehaviorFormMetadata(params: {
  behavior: BehaviorEntry;
  categoryFields: MetadataField[];
  values: Record<string, string>;
  typedFormulaKeys: readonly string[];
  notes?: string;
}): LogEntry['metadata'] {
  const { fields, amountField, amountOptedOut } = getBehaviorFormFields(params.behavior, params.categoryFields);
  const { effectiveValues } = resolveFormulaState({
    fields,
    amountField,
    amountOptedOut,
    values: params.values,
    typedKeys: params.typedFormulaKeys,
  });
  return buildLogMetadata({
    fields,
    amountField,
    values: effectiveValues,
    defaultMetadata: params.behavior.defaultMetadata,
    rateBasis: params.behavior.metadataRateBasis,
    notes: params.notes,
  });
}

/** Manual/Formula choices a behaviour opens its log form with. */
export function getBehaviorInitialTypedFormulaKeys(
  behavior: BehaviorEntry,
  categoryFields: MetadataField[],
  existingMetadata?: LogEntry['metadata'],
): string[] {
  const { fields, amountField, amountOptedOut } = getBehaviorFormFields(behavior, categoryFields);
  const { formulaFields } = resolveFormulaState({ fields, amountField, amountOptedOut, values: {}, typedKeys: [] });
  return getInitialTypedFormulaKeys(formulaFields, behavior.metadataTypedFormulaKeys, existingMetadata);
}

/** What to store as the behaviour's remembered Manual/Formula choices after a save, or `null` to leave it. */
export function getBehaviorRememberedTypedKeys(
  behavior: BehaviorEntry,
  categoryFields: MetadataField[],
  typedFormulaKeys: readonly string[],
): string[] | null {
  const { fields, amountField, amountOptedOut } = getBehaviorFormFields(behavior, categoryFields);
  const { formulaFields } = resolveFormulaState({ fields, amountField, amountOptedOut, values: {}, typedKeys: [] });
  return getNextRememberedTypedKeys(formulaFields, behavior.metadataTypedFormulaKeys, typedFormulaKeys);
}

/** A stacked behaviour's Manual/Formula choices: its own, or what the behaviour last used (Manual when never chosen). */
export function getStackedTypedFormulaKeys(
  stacked: StackedLog,
  behavior: BehaviorEntry,
  categoryFields: MetadataField[],
): string[] {
  return stacked.typedFormulaKeys ?? getBehaviorInitialTypedFormulaKeys(behavior, categoryFields);
}

/** Daily-goal progress bars for every field of one behaviour's log: today's total so far, and what this log adds. */
export function getFormProgressByField(params: {
  behavior: BehaviorEntry;
  fields: MetadataField[];
  /** Values with formula results already applied. */
  values: Record<string, string>;
  calculatedValues: Record<string, number>;
  dateStr: string;
  dayCutoffHour: number;
  editLogId?: string;
  /** Behaviours of the category, so the total matches the day screen's per-category sum. */
  categoryBehaviors?: BehaviorEntry[];
}): Record<string, DailyGoalProgress | null> {
  const map: Record<string, DailyGoalProgress | null> = {};
  for (const field of params.fields) {
    let newValue: number | undefined;
    if (field.calculation === 'per100') {
      newValue = params.calculatedValues[field.key];
    } else {
      const raw = params.values[field.key];
      newValue = raw === undefined ? undefined : parseDecimalInput(raw);
    }
    map[field.key] = getDailyGoalProgress({
      behavior: params.behavior,
      dateStr: params.dateStr,
      field,
      newValue,
      dayCutoffHour: params.dayCutoffHour,
      editLogId: params.editLogId,
      categoryBehaviors: params.categoryBehaviors,
    });
  }
  return map;
}
