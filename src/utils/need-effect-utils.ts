import type { BehaviorEntry } from '../types/behavior';
import type { NeedConfig, NeedEffect, NeedId } from '../types/need';
import { clampLevel, TIMER_PREVIEW_LOG_ID } from './need-utils';

/** A check-in this long after a log ends can be blamed on it. */
export const EFFECT_WINDOW_MS = 90 * 60_000;
/** A check-in this many points off what was expected asks whether a recent behaviour did it. */
export const EFFECT_MIN_GAP = 10;
/** Confirmed check-ins kept per effect. */
export const EFFECT_MAX_SAMPLES = 6;
/** From this many samples on, the kind (drop by / down to) is picked from which one varies less. */
export const EFFECT_KIND_MIN_SAMPLES = 3;
/** Most behaviours a prompt offers. */
export const EFFECT_MAX_CANDIDATES = 3;

export interface EffectCandidate {
  behaviorId: string;
  logId: string;
  endTs: number;
}

/**
 * Behaviours whose latest log ended within the window before `ts`, newest first. Behaviours that refill
 * the need are left out: a check-in after them is about the refill, not a side effect.
 */
export function findEffectCandidates(
  behaviors: readonly BehaviorEntry[],
  config: Pick<NeedConfig, 'refills' | 'categoryRefills'>,
  ts: number,
): EffectCandidate[] {
  const candidates: EffectCandidate[] = [];
  for (const behavior of behaviors) {
    if (behavior.archivedAt != null) continue;
    if (config.refills[behavior.id]) continue;
    if (behavior.categoryId && config.categoryRefills?.[behavior.categoryId]) continue;
    let latest: EffectCandidate | undefined;
    for (const log of behavior.logs) {
      if (log.id === TIMER_PREVIEW_LOG_ID || log.batchBehaviorId) continue;
      const endTs = log.endTimestamp ?? log.timestamp;
      if (endTs > ts || ts - endTs > EFFECT_WINDOW_MS) continue;
      if (!latest || endTs > latest.endTs) latest = { behaviorId: behavior.id, logId: log.id, endTs };
    }
    if (latest) candidates.push(latest);
  }
  return candidates.sort((a, b) => b.endTs - a.endTs).slice(0, EFFECT_MAX_CANDIDATES);
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const spread = (values: number[]) => {
  const avg = mean(values);
  return Math.sqrt(mean(values.map(value => (value - avg) ** 2)));
};

/**
 * Adds a confirmed check-in to an effect (or starts one). A drop starts as "down to" the level you checked
 * in at, since a check-in sets the level. Once there are a few samples, it stays "down to" if where you
 * end up varies less than how far you drop, else it becomes "drop by". A rise is always "by".
 */
export function addEffectSample(
  effect: NeedEffect | undefined,
  sample: { expected: number; actual: number },
): NeedEffect {
  const samples = [...(effect?.samples ?? []), sample].slice(-EFFECT_MAX_SAMPLES);
  const actuals = samples.map(item => item.actual);
  const diffs = samples.map(item => item.actual - item.expected);
  const avgDiff = mean(diffs);
  let kind: NeedEffect['kind'] = avgDiff < 0 ? 'to' : 'by';
  if (avgDiff < 0 && samples.length >= EFFECT_KIND_MIN_SAMPLES && spread(diffs) < spread(actuals)) kind = 'by';
  const amount = kind === 'to' ? clampLevel(Math.round(mean(actuals))) : Math.round(avgDiff);
  return { kind, amount, source: 'learned', seen: (effect?.seen ?? 0) + 1, samples };
}

/** The level right after the effect lands on `level`. */
export function forecastEffect(level: number, effect: Pick<NeedEffect, 'kind' | 'amount'>): number {
  if (effect.kind === 'to') return Math.min(level, clampLevel(effect.amount));
  return clampLevel(level + effect.amount);
}

/** True when the effect lowers the need (or can). */
export function isLoweringEffect(effect: Pick<NeedEffect, 'kind' | 'amount'>): boolean {
  return effect.kind === 'to' || effect.amount < 0;
}

/** "−20%", "+15%" or "to 25%". */
export function formatEffect(effect: Pick<NeedEffect, 'kind' | 'amount'>): string {
  if (effect.kind === 'to') return `to ${Math.round(effect.amount)}%`;
  const rounded = Math.round(effect.amount);
  return `${rounded < 0 ? '−' : '+'}${Math.abs(rounded)}%`;
}

/** "seen 3×", "you set" for an effect's evidence. */
export function formatEffectSource(effect: Pick<NeedEffect, 'source' | 'seen'>): string {
  return effect.source === 'you' ? 'you set' : `seen ${effect.seen}×`;
}

/** "Usually takes Brain Energy down to ~25% (now 62%)" style forecast, or undefined when it changes nothing. */
export function describeEffectForecast(
  label: string,
  level: number | undefined,
  effect: Pick<NeedEffect, 'kind' | 'amount'>,
): string | undefined {
  if (level == null) {
    return effect.kind === 'to'
      ? `Usually takes ${label} down to ~${Math.round(effect.amount)}%`
      : `Usually ${effect.amount < 0 ? 'drops' : 'raises'} ${label} ${Math.abs(Math.round(effect.amount))}%`;
  }
  const after = forecastEffect(level, effect);
  if (Math.round(after) === Math.round(level)) return undefined;
  return `Usually ${label} ${Math.round(level)}% → ~${Math.round(after)}%`;
}

export interface BehaviorEffect {
  needId: NeedId;
  effect: NeedEffect;
}

/** A behaviour's side effects on the enabled needs, in need order. */
export function getBehaviorEffects(
  configs: Readonly<Record<NeedId, NeedConfig>>,
  behaviorId: string,
  needIds: readonly NeedId[],
): BehaviorEffect[] {
  return needIds.flatMap(needId => {
    const config = configs[needId];
    const effect = config?.enabled ? config.effects?.[behaviorId] : undefined;
    return effect ? [{ needId, effect }] : [];
  });
}

/** Behaviours with a side effect on one need, split into the ones that lower it and the ones that raise it. */
export function getNeedEffectBehaviors(config: Pick<NeedConfig, 'effects'>): {
  lowers: Array<{ behaviorId: string; effect: NeedEffect }>;
  raises: Array<{ behaviorId: string; effect: NeedEffect }>;
} {
  const entries = Object.entries(config.effects ?? {}).map(([behaviorId, effect]) => ({ behaviorId, effect }));
  const strength = (effect: NeedEffect) => (effect.kind === 'to' ? 100 - effect.amount : Math.abs(effect.amount));
  const lowers = entries.filter(entry => isLoweringEffect(entry.effect));
  const raises = entries.filter(entry => !isLoweringEffect(entry.effect));
  lowers.sort((a, b) => strength(b.effect) - strength(a.effect));
  raises.sort((a, b) => strength(b.effect) - strength(a.effect));
  return { lowers, raises };
}

/** Brain Energy this high after bedtime reads as "can't sleep". */
export const CANT_SLEEP_LEVEL = 60;

/** True from 23:00 to 05:00 local time, when being wide awake is the problem. */
export function isLateNight(ts: number): boolean {
  const hour = new Date(ts).getHours();
  return hour >= 23 || hour < 5;
}
