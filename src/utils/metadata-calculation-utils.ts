import type { BehaviorEntry, MetadataField, MetadataFieldCalculation } from '../types/behavior';
import { roundTo2 } from './number-utils';
import { getLogsForDate } from './star-utils';

const MetadataFieldCalculationOrder: Record<MetadataFieldCalculation, number> = {
  manual: 0,
  amount: 1,
  per100: 2,
};

export function sanitizeDecimalInput(value: string): string {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const [first, ...rest] = sanitized.split('.');
  return rest.length > 0 ? `${first}.${rest.join('')}` : sanitized;
}

export function getMetadataFieldCalculation(field: MetadataField): MetadataFieldCalculation {
  return field.calculation ?? 'manual';
}

export function sortMetadataFieldsByCalculation(fields: MetadataField[]): MetadataField[] {
  return fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => {
      const rankDiff =
        MetadataFieldCalculationOrder[getMetadataFieldCalculation(a.field)] -
        MetadataFieldCalculationOrder[getMetadataFieldCalculation(b.field)];
      return rankDiff || a.index - b.index;
    })
    .map(({ field }) => field);
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

export function getSelectedAmountMetadataField(
  fields: MetadataField[],
  selectedAmountFieldKey?: string,
  legacyQuantityUnit?: string,
): MetadataField | undefined {
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

export function formatMetadataAmountBasis(field?: MetadataField): string {
  if (!field) return '';
  return field.unit ? `100${field.unit}` : `100 ${field.label}`;
}

interface FormatMetadataRateUnitParams {
  field: MetadataField;
  amountField?: MetadataField;
  separator?: string;
  includeFieldUnit?: boolean;
}

export function formatMetadataRateUnit({
  field,
  amountField,
  separator = '',
  includeFieldUnit = true,
}: FormatMetadataRateUnitParams): string {
  const unit = includeFieldUnit && field.unit ? `${field.unit} ` : '';
  return `${unit}${separator}/ ${formatMetadataAmountBasis(amountField)}`;
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
): Record<string, number> {
  if (amountValue == null || !Number.isFinite(amountValue)) return {};

  return Object.fromEntries(
    getCalculatedMetadataFields(fields)
      .map(field => {
        const rate = defaultMetadata?.[field.key];
        if (rate == null || !Number.isFinite(rate)) return null;
        return [field.key, roundTo2((rate * amountValue) / 100)] as const;
      })
      .filter((entry): entry is readonly [string, number] => entry != null),
  );
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
}

/** Sum a metadata field's value across all logs on `dateStr`, optionally
 *  skipping the log being edited so the caller can show "current" as
 *  everything-but-this-log. Non-numeric or missing values are treated as 0. */
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

/** Daily-goal progress for a single metadata field. Returns `null` when the
 *  field has no `dailyGoal` (or it's <= 0) so callers can skip rendering the
 *  bar entirely. `after` includes the value the user is about to log. */
export function getDailyGoalProgress({
  behavior,
  dateStr,
  field,
  newValue,
  dayCutoffHour = 0,
  editLogId,
}: GetDailyGoalProgressParams): DailyGoalProgress | null {
  const goal = field.dailyGoal;
  if (goal == null || !Number.isFinite(goal) || goal <= 0) return null;

  const current = sumFieldOnDate(behavior, dateStr, field.key, dayCutoffHour, editLogId);
  const contribution = newValue != null && Number.isFinite(newValue) && newValue > 0 ? newValue : 0;
  const after = current + contribution;
  const deltaPercent = Math.round(((after - current) / goal) * 100);

  return { current, after, goal, deltaPercent };
}
