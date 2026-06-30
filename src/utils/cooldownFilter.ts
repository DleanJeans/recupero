import type { BehaviorEntry } from '../types/behavior';
import { isCooldownActive } from './cooldownUtils';

export const COOLDOWN_CATEGORY_FILTER_ID = '__recupero_cooldown_filter__';
export const COOLDOWN_FILTER_LABEL = 'Cooldown';

export function isCooldownCategoryFilterId(id: string | null | undefined): boolean {
  return id === COOLDOWN_CATEGORY_FILTER_ID;
}

export function hasFilterableCooldown(behavior: BehaviorEntry): boolean {
  return isCooldownActive(behavior) && behavior.lastTimestamp !== null;
}

export function getCooldownProgress(behavior: BehaviorEntry, now = Date.now()): number {
  if (!hasFilterableCooldown(behavior)) return Number.NEGATIVE_INFINITY;
  const elapsedMinutes = Math.max(0, (now - behavior.lastTimestamp!) / 60_000);
  return elapsedMinutes / behavior.cooldownMinutes;
}

export function sortBehaviorsByCooldownProgress(behaviors: BehaviorEntry[], now = Date.now()): BehaviorEntry[] {
  return [...behaviors].sort((a, b) => {
    const progressDiff = getCooldownProgress(b, now) - getCooldownProgress(a, now);
    if (progressDiff !== 0) return progressDiff;

    const aTimestamp = a.lastTimestamp ?? 0;
    const bTimestamp = b.lastTimestamp ?? 0;
    const timestampDiff = aTimestamp - bTimestamp;
    if (timestampDiff !== 0) return timestampDiff;

    return a.name.localeCompare(b.name);
  });
}

export function getCooldownBehaviors(behaviors: BehaviorEntry[], now = Date.now()): BehaviorEntry[] {
  return sortBehaviorsByCooldownProgress(behaviors.filter(hasFilterableCooldown), now);
}

export function countCooldownBehaviors(behaviors: BehaviorEntry[]): number {
  return behaviors.filter(hasFilterableCooldown).length;
}

export function countBehaviorsPastCooldown(behaviors: BehaviorEntry[], now = Date.now()): number {
  return behaviors.filter(behavior => getCooldownProgress(behavior, now) >= 1).length;
}
