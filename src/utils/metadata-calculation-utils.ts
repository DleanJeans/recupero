import type { BehaviorEntry, LogEntry, MetadataField, MetadataFieldCalculation } from '../types/behavior';
import { roundTo2 } from './number-utils';
import { getLogsForDate } from './star-utils';

export function sanitizeDecimalInput(value: string): string {
  return value
    .replace(/[^0-9.-]/g, '')
    .split('-')
    .map(term => {
      const [first, ...rest] = term.split('.');
      return rest.length > 0 ? `${first}.${rest.join('')}` : term;
    })
    .join('-');
}

export function evaluateDecimalInput(value: string): string {
  const sanitized = sanitizeDecimalInput(value);
  if (!/^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)*$/.test(sanitized)) return sanitized;

  const [first, ...rest] = sanitized.split('-');
  const result = rest.reduce((total, term) => total - Number(term), Number(first));
  return Number.isFinite(result) ? String(Number(result.toFixed(10))) : sanitized;
}

export function parseDecimalInput(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(evaluateDecimalInput(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getMetadataFieldCalculation(field: MetadataField): MetadataFieldCalculation {
  return field.calculation ?? 'manual';
}

export function getAmountMetadataFields(fields: MetadataField[]): MetadataField[] {
  return fields.filter(field => getMetadataFieldCalculation(field) === 'amount');
}

export function getManualMetadataFields(fields: MetadataField[]): MetadataField[] {
  return fields.filter(field => getMetadataFieldCalculation(field) === 'manual');
}

export function getCalculatedMetadataFields(fields: MetadataField[]): MetadataField[] {
  return fields.filter(field => getMetadataFieldCalculation(field) === 'per100');
}

/** Stored as a behaviour's `metadataAmountFieldKey` when the user opts out of an amount unit ("None"). */
export const NO_AMOUNT_FIELD_KEY = '__none__';

export function getSelectedAmountMetadataField(
  fields: MetadataField[],
  selectedAmountFieldKey?: string,
  legacyQuantityUnit?: string,
): MetadataField | undefined {
  if (selectedAmountFieldKey === NO_AMOUNT_FIELD_KEY) return undefined;
  const amountFields = getAmountMetadataFields(fields);
  return (
    amountFields.find(field => field.key === selectedAmountFieldKey) ??
    amountFields.find(field => field.unit === legacyQuantityUnit) ??
    amountFields[0]
  );
}

export function getMetadataFieldUnit(field: MetadataField): string | undefined {
  return field.unit;
}

export function formatMetadataFieldLabel(field: MetadataField): string {
  const unit = getMetadataFieldUnit(field);
  return `${field.label}${unit ? ` (${unit})` : ''}`;
}

export function formatMetadataValueUnit(field: MetadataField): string {
  const unit = getMetadataFieldUnit(field);
  return unit ? ` ${unit}` : '';
}

/** The amount a behaviour's calculated rates are given for when it hasn't set its own (e.g. per 100 g). */
export const DEFAULT_METADATA_RATE_BASIS = 100;

/** Normalizes a stored rate basis: anything missing, non-finite or not positive falls back to 100. */
export function resolveMetadataRateBasis(rateBasis: number | undefined): number {
  return rateBasis != null && Number.isFinite(rateBasis) && rateBasis > 0 ? rateBasis : DEFAULT_METADATA_RATE_BASIS;
}

/** The amount a behaviour's calculated rates are given for, e.g. 30 when the label lists values per 30 g portion. */
export function getMetadataRateBasis(behavior: Pick<BehaviorEntry, 'metadataRateBasis'> | undefined): number {
  return resolveMetadataRateBasis(behavior?.metadataRateBasis);
}

export function formatMetadataAmountBasis(field?: MetadataField, rateBasis?: number): string {
  if (!field) return '';
  const basis = resolveMetadataRateBasis(rateBasis);
  return field.unit ? `${basis}${field.unit}` : `${basis} ${field.label}`;
}

interface FormatMetadataRateUnitParams {
  field: MetadataField;
  amountField?: MetadataField;
  separator?: string;
  includeFieldUnit?: boolean;
  rateBasis?: number;
}

export function formatMetadataRateUnit({
  field,
  amountField,
  separator = '',
  includeFieldUnit = true,
  rateBasis,
}: FormatMetadataRateUnitParams): string {
  const unit = includeFieldUnit && field.unit ? `${field.unit} ` : '';
  return `${unit}${separator}/ ${formatMetadataAmountBasis(amountField, rateBasis)}`;
}

export function getLoggableDefaultMetadata(
  defaultMetadata: Record<string, number> | undefined,
  fields: MetadataField[] | undefined,
): Record<string, number> {
  if (!defaultMetadata) return {};
  if (!fields?.length) return { ...defaultMetadata };

  const fieldByKey = new Map(fields.map(field => [field.key, field]));
  return Object.fromEntries(
    Object.entries(defaultMetadata).filter(([key]) => {
      const field = fieldByKey.get(key);
      return !field || getMetadataFieldCalculation(field) === 'manual';
    }),
  );
}

export function buildCalculatedMetadata(
  fields: MetadataField[],
  defaultMetadata: Record<string, number> | undefined,
  amountValue: number | undefined,
  rateBasis?: number,
): Record<string, number> {
  if (amountValue == null || !Number.isFinite(amountValue)) return {};
  const basis = resolveMetadataRateBasis(rateBasis);

  return Object.fromEntries(
    getCalculatedMetadataFields(fields)
      .map(field => {
        const rate = defaultMetadata?.[field.key];
        if (rate == null || !Number.isFinite(rate)) return null;
        return [field.key, roundTo2((rate * amountValue) / basis)] as const;
      })
      .filter((entry): entry is readonly [string, number] => entry != null),
  );
}

interface SyncBehaviorLogMetadataParams {
  metadata: LogEntry['metadata'];
  fields: MetadataField[];
  previousDefaultMetadata?: Record<string, number>;
  defaultMetadata?: Record<string, number>;
  amountField?: MetadataField;
  rateBasis?: number;
}

export function syncBehaviorLogMetadata({
  metadata,
  fields,
  previousDefaultMetadata,
  defaultMetadata,
  amountField,
  rateBasis,
}: SyncBehaviorLogMetadataParams): LogEntry['metadata'] {
  const nextMetadata = { ...(metadata ?? {}) };
  const previousManualMetadata = getLoggableDefaultMetadata(previousDefaultMetadata, fields);
  const manualMetadata = getLoggableDefaultMetadata(defaultMetadata, fields);

  for (const key of Object.keys(previousManualMetadata)) {
    if (!(key in manualMetadata)) delete nextMetadata[key];
  }
  Object.assign(nextMetadata, manualMetadata);

  const rawAmount = amountField ? nextMetadata[amountField.key] : undefined;
  const amountValue =
    typeof rawAmount === 'number'
      ? Number.isFinite(rawAmount)
        ? rawAmount
        : undefined
      : parseDecimalInput(String(rawAmount ?? ''));
  if (amountValue != null) {
    const calculatedMetadata = buildCalculatedMetadata(fields, defaultMetadata, amountValue, rateBasis);
    for (const field of getCalculatedMetadataFields(fields)) {
      const value = calculatedMetadata[field.key];
      if (value != null) {
        nextMetadata[field.key] = value;
      } else {
        delete nextMetadata[field.key];
      }
    }
  }

  return Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined;
}

export interface DailyGoalProgress {
  current: number;
  after: number;
  goal: number;
  deltaPercent: number;
}

interface GetDailyGoalProgressParams {
  behavior: BehaviorEntry;
  dateStr: string;
  field: MetadataField;
  newValue?: number;
  dayCutoffHour?: number;
  editLogId?: string;
  /** When set, sum the field across all these behaviors (typically every
   *  behavior in the same category) instead of just `behavior`. The form
   *  uses this so its progress matches the day screen, which also sums
   *  per category. `editLogId` is still skipped when present. */
  categoryBehaviors?: BehaviorEntry[];
}

/** Sum a metadata field's value across all logs on `dateStr` for the given
 *  behavior, optionally skipping the log being edited so the caller can show
 *  "current" as everything-but-this-log. Non-numeric or missing values are
 *  treated as 0. */
function sumFieldOnDate(
  behavior: BehaviorEntry,
  dateStr: string,
  fieldKey: string,
  dayCutoffHour: number,
  editLogId?: string,
): number {
  let total = 0;
  for (const log of getLogsForDate(behavior, dateStr, dayCutoffHour)) {
    if (editLogId != null && log.id === editLogId) continue;
    const value = log.metadata?.[fieldKey];
    if (typeof value === 'number' && Number.isFinite(value)) total += value;
  }
  return total;
}

/** Sum a metadata field's value across all logs on `dateStr` for every
 *  behavior in `behaviors`, optionally skipping the log being edited. */
function sumFieldOnDateAcrossBehaviors(
  behaviors: BehaviorEntry[],
  dateStr: string,
  fieldKey: string,
  dayCutoffHour: number,
  editLogId?: string,
): number {
  let total = 0;
  for (const behavior of behaviors) {
    total += sumFieldOnDate(behavior, dateStr, fieldKey, dayCutoffHour, editLogId);
  }
  return total;
}

/** Daily-goal progress for a single metadata field. Returns `null` when the
 *  field has no `dailyGoal` (or it's <= 0) so callers can skip rendering the
 *  bar entirely. `after` includes the value the user is about to log. When
 *  `categoryBehaviors` is provided, "current" sums across all of them so the
 *  bar matches the per-category total shown on the day screen. */
export function getDailyGoalProgress({
  behavior,
  dateStr,
  field,
  newValue,
  dayCutoffHour = 0,
  editLogId,
  categoryBehaviors,
}: GetDailyGoalProgressParams): DailyGoalProgress | null {
  const goal = field.dailyGoal;
  if (goal == null || !Number.isFinite(goal) || goal <= 0) return null;

  const current =
    categoryBehaviors != null
      ? sumFieldOnDateAcrossBehaviors(categoryBehaviors, dateStr, field.key, dayCutoffHour, editLogId)
      : sumFieldOnDate(behavior, dateStr, field.key, dayCutoffHour, editLogId);
  const contribution = newValue != null && Number.isFinite(newValue) && newValue > 0 ? newValue : 0;
  const after = current + contribution;
  const deltaPercent = Math.round(((after - current) / goal) * 100);

  return { current, after, goal, deltaPercent };
}

/** Text-input values a new log form starts with: the behaviour's defaults for the amount and manual fields. */
export function getInitialLogMetadataValues(
  fields: MetadataField[],
  amountField: MetadataField | undefined,
  defaultMetadata: Record<string, number> | undefined,
): Record<string, string> {
  const values: Record<string, string> = {};
  if (!defaultMetadata) return values;
  const manualFields = getManualMetadataFields(fields);
  for (const field of amountField ? [amountField, ...manualFields] : manualFields) {
    const value = defaultMetadata[field.key];
    if (value != null) values[field.key] = String(value);
  }
  return values;
}

interface BuildLogMetadataParams {
  fields: MetadataField[];
  amountField?: MetadataField;
  values: Record<string, string>;
  defaultMetadata?: Record<string, number>;
  rateBasis?: number;
  notes?: string;
}

/** Turns log form inputs into the metadata saved on a LogEntry (rate fields are calculated from the amount). */
export function buildLogMetadata({
  fields,
  amountField,
  values,
  defaultMetadata,
  rateBasis,
  notes,
}: BuildLogMetadataParams): Record<string, string | number> | undefined {
  const metadata: Record<string, string | number> = {};
  const trimmedNotes = notes?.trim();
  if (trimmedNotes) metadata.notes = trimmedNotes;
  const parse = (field: MetadataField) => {
    const value = values[field.key];
    return value === undefined ? undefined : parseDecimalInput(value);
  };
  const inputFields = amountField ? [amountField, ...getManualMetadataFields(fields)] : fields;
  for (const field of inputFields) {
    const parsed = parse(field);
    if (parsed != null) metadata[field.key] = parsed;
  }
  if (amountField) {
    const amountValue = values[amountField.key];
    if (amountValue !== undefined && amountValue !== '') {
      Object.assign(
        metadata,
        buildCalculatedMetadata(fields, defaultMetadata, parseDecimalInput(amountValue), rateBasis),
      );
    }
    for (const field of getCalculatedMetadataFields(fields)) {
      if (metadata[field.key] != null) continue;
      const parsed = parse(field);
      if (parsed != null) metadata[field.key] = parsed;
    }
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/** A behaviour logged together with the one the log form is open for (habit stacking). */
export interface StackedLog {
  behaviorId: string;
  /** Metadata text-input values, keyed by field key. */
  metadataValues: Record<string, string>;
}

export function getBehaviorMetadataFields(
  behavior: BehaviorEntry,
  categories: { id: string; metadataFields?: MetadataField[] }[],
): MetadataField[] {
  if (!behavior.categoryId) return [];
  return categories.find(category => category.id === behavior.categoryId)?.metadataFields ?? [];
}

export function getBehaviorAmountField(behavior: BehaviorEntry, fields: MetadataField[]): MetadataField | undefined {
  return getSelectedAmountMetadataField(fields, behavior.metadataAmountFieldKey, behavior.metadataQuantityUnit);
}
