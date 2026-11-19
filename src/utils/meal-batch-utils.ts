import type { BehaviorEntry, Category, MealBatch, MetadataField } from '../types/behavior';
import {
  DEFAULT_METADATA_RATE_BASIS,
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getCalculatedMetadataFields,
  getMetadataRateBasis,
} from './metadata-calculation-utils';

export interface BatchIngredientInput {
  behavior: BehaviorEntry;
  /** Raw amount weighed, in the behaviour's amount unit. */
  amount: number;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Calculated-rate fields of the first ingredient category that has any, and that category. Null when none does. */
export function pickBatchCategory(
  behaviors: BehaviorEntry[],
  categories: Category[],
): { category: Category; fields: MetadataField[] } | null {
  for (const behavior of behaviors) {
    const fields = getBehaviorMetadataFields(behavior, categories);
    if (getCalculatedMetadataFields(fields).length === 0) continue;
    const category = categories.find(candidate => candidate.id === behavior.categoryId);
    if (category) return { category, fields };
  }
  return null;
}

/** What one ingredient adds to each calculated field: rate x amount / the amount its rates are given for. Ingredients
 *  with a different rate basis (per 30 g, per 100 g, per piece) all land on the same totals. */
export function getIngredientTotals(
  fields: MetadataField[],
  { behavior, amount }: BatchIngredientInput,
): Record<string, number> {
  if (!Number.isFinite(amount) || amount <= 0) return {};
  const basis = getMetadataRateBasis(behavior);
  const totals: Record<string, number> = {};
  for (const field of getCalculatedMetadataFields(fields)) {
    const rate = behavior.defaultMetadata?.[field.key];
    if (rate == null || !Number.isFinite(rate)) continue;
    totals[field.key] = (rate * amount) / basis;
  }
  return totals;
}

export function sumBatchTotals(fields: MetadataField[], ingredients: BatchIngredientInput[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const ingredient of ingredients) {
    for (const [key, value] of Object.entries(getIngredientTotals(fields, ingredient))) {
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
}

/** Rates for the batch behaviour: the batch totals spread over the cooked amount, given per `rateBasis` of it. */
export function getBatchRates(
  totals: Record<string, number>,
  cookedAmount: number,
  rateBasis: number = DEFAULT_METADATA_RATE_BASIS,
): Record<string, number> {
  if (!Number.isFinite(cookedAmount) || cookedAmount <= 0) return {};
  return Object.fromEntries(
    Object.entries(totals).map(([key, total]) => [key, round((total * rateBasis) / cookedAmount, 4)]),
  );
}

/** A portion's macros: batch totals x portion / cooked (what the log form does with the stored rates). */
export function getPortionValues(
  totals: Record<string, number>,
  cookedAmount: number,
  portionAmount: number,
): Record<string, number> {
  if (!Number.isFinite(cookedAmount) || cookedAmount <= 0 || !Number.isFinite(portionAmount)) return {};
  return Object.fromEntries(
    Object.entries(totals).map(([key, total]) => [key, round((total * portionAmount) / cookedAmount, 2)]),
  );
}

/** Total amount logged so far for a batch behaviour. */
export function getBatchEatenAmount(behavior: BehaviorEntry, amountField: MetadataField | undefined): number {
  if (!amountField) return 0;
  let eaten = 0;
  for (const log of behavior.logs) {
    const value = log.metadata?.[amountField.key];
    if (typeof value === 'number' && Number.isFinite(value)) eaten += value;
  }
  return eaten;
}

export interface BatchStatus {
  cooked: number;
  eaten: number;
  /** Never below 0. */
  left: number;
  portions: number;
  unit: string;
  finished: boolean;
}

export function getBatchStatus(behavior: BehaviorEntry, categories: Category[]): BatchStatus | null {
  const batch: MealBatch | undefined = behavior.batch;
  if (!batch) return null;
  const amountField = getBehaviorAmountField(behavior, getBehaviorMetadataFields(behavior, categories));
  const eaten = getBatchEatenAmount(behavior, amountField);
  return {
    cooked: batch.cookedAmount,
    eaten,
    left: Math.max(0, round(batch.cookedAmount - eaten, 2)),
    portions: behavior.logs.length,
    unit: amountField?.unit ?? '',
    finished: batch.finishedAt != null,
  };
}

/** The amount suggested when logging a portion: cooked / planned portions, rounded to 5. */
export function getSuggestedPortionAmount(
  cookedAmount: number,
  plannedPortions: number | undefined,
): number | undefined {
  if (!plannedPortions || plannedPortions <= 0 || !Number.isFinite(cookedAmount) || cookedAmount <= 0) return undefined;
  return Math.max(1, Math.round(cookedAmount / plannedPortions / 5) * 5);
}

/** "Chicken rice bowl · Nov 16" */
export function buildBatchName(name: string, cookedAt: number): string {
  const date = new Date(cookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${name.trim()} · ${date}`;
}

/** Strips the " · Nov 16" suffix back off when editing a batch, so it is not added twice. */
export function stripBatchNameDate(name: string): string {
  return name.replace(/ · [A-Z][a-z]{2} \d{1,2}$/, '');
}

export interface LeftoverAdjustment {
  /** Eaten so far + the leftover just weighed: what the pot really held, after any water evaporated. */
  cookedAmount: number;
  /** Same as the behaviour's, with calculated rates raised to match the smaller pot. */
  defaultMetadata: Record<string, number>;
}

/** The batch after weighing what is left: cooked amount becomes eaten + leftover and the rates (the same totals
 *  spread over less food) are rescaled. Null when there is nothing to adjust. */
export function getLeftoverAdjustment(
  behavior: BehaviorEntry,
  categories: Category[],
  leftover: number,
): LeftoverAdjustment | null {
  const status = getBatchStatus(behavior, categories);
  if (!behavior.batch || !status || !Number.isFinite(leftover) || leftover < 0) return null;
  const cookedAmount = round(status.eaten + leftover, 2);
  if (cookedAmount <= 0 || behavior.batch.cookedAmount <= 0) return null;
  const amountField = getBehaviorAmountField(behavior, getBehaviorMetadataFields(behavior, categories));
  const factor = behavior.batch.cookedAmount / cookedAmount;
  const defaultMetadata = Object.fromEntries(
    Object.entries(behavior.defaultMetadata ?? {}).map(([key, value]) => [
      key,
      key === amountField?.key ? value : round(value * factor, 4),
    ]),
  );
  return { cookedAmount, defaultMetadata };
}

/**
 * Gives every ingredient of a batch one log (at the cooked time) that points back to the batch behaviour, replacing
 * the ones made earlier for it. They carry only the raw amount weighed, so they never fill needs or add macros
 * (the portions of the batch carry those). Safe to run repeatedly. Ingredients that no longer exist are skipped.
 */
export function syncBatchIngredientLogs(
  behaviors: BehaviorEntry[],
  categories: Category[],
  batchBehaviorId: string,
  makeId: () => string,
): BehaviorEntry[] {
  const batchBehavior = behaviors.find(behavior => behavior.id === batchBehaviorId);
  const batch = batchBehavior?.batch;
  if (!batch) return behaviors;
  const amounts = new Map<string, number>();
  for (const ingredient of batch.ingredients) {
    amounts.set(ingredient.behaviorId, (amounts.get(ingredient.behaviorId) ?? 0) + ingredient.amount);
  }
  return behaviors.map(behavior => {
    const kept = behavior.logs.filter(log => log.batchBehaviorId !== batchBehaviorId);
    const amount = amounts.get(behavior.id);
    if (amount == null || behavior.id === batchBehaviorId) {
      return kept.length === behavior.logs.length ? behavior : { ...behavior, logs: kept };
    }
    const amountField = getBehaviorAmountField(behavior, getBehaviorMetadataFields(behavior, categories));
    const log = {
      id: makeId(),
      timestamp: batch.cookedAt,
      batchBehaviorId,
      ...(amountField ? { metadata: { [amountField.key]: amount } } : {}),
    };
    const logs = [...kept, log].sort((a, b) => a.timestamp - b.timestamp);
    return { ...behavior, logs, lastTimestamp: Math.max(behavior.lastTimestamp ?? 0, batch.cookedAt) };
  });
}
