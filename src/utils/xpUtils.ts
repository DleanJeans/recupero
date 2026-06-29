import type { BehaviorEntry, XpDecayUnit } from '../types/behavior';
import { calendarDayDiff, MS_PER_DAY } from './dateUtils';
import { getLogDurationMinutes, getLogEndTimestamp, getLogStartTimestamp, LEGACY_LOG_XP } from './logUtils';

export const XP_PER_LOG = LEGACY_LOG_XP;

/** Convert a `xpDecay.unit` + `every` to a day count. */
export function decayEveryInDays(every: number, unit: XpDecayUnit): number {
  if (unit === 'days') return every;
  if (unit === 'weeks') return every * 7;
  return every * 30; // months → 30-day approximation
}

/** Number of "log equivalents" lost to XP decay across the behavior's lifetime,
 *  computed on read.
 *
 *  **Era-reset behavior:** when a single inter-log gap's decay would cancel all
 *  logs accumulated since the last reset, that log starts a new era — only logs
 *  from the latest era count toward XP. This keeps abandoned behaviors from
 *  getting stuck at 0 XP: a long pause triggers a reset rather than permanent 0.
 *
 *  Each gap counts days *strictly between* its endpoints (excludes both), so a
 *  same-day or 1-day-apart pair never decays. Returns 0 when the feature is off,
 *  no logs exist, or no decay has accrued. */
export function getDecayLogCount(behavior: BehaviorEntry, now: number = Date.now()): number {
  const { xpDecay, logs } = behavior;
  if (!behavior.xpEnabled) return 0;
  if (!xpDecay) return 0;
  if (logs.length === 0) return 0;

  const everyDays = decayEveryInDays(xpDecay.every, xpDecay.unit);
  if (!Number.isFinite(everyDays) || everyDays <= 0) return 0;

  // Defensive: assume logs may arrive out of order. Cheaper than trusting call sites.
  const sorted = [...logs].sort((a, b) => getLogStartTimestamp(a) - getLogStartTimestamp(b));
  const N = sorted.length;

  // Walk inter-log gaps. Reset the era at any log whose incoming gap's decay
  // is >= the number of logs in the current era — that gap wipes them out.
  let eraStart = 0;
  for (let i = 1; i < N; i++) {
    const gapDecay = decayForGap(getLogEndTimestamp(sorted[i - 1]), getLogStartTimestamp(sorted[i]), everyDays);
    if (gapDecay >= i - eraStart) {
      eraStart = i;
    }
  }

  // Final gap: most recent log → now. Caps at N since we can't cancel more logs than exist.
  const finalDecay = decayForGap(getLogEndTimestamp(sorted[N - 1]), now, everyDays);
  return Math.min(N, eraStart + finalDecay);
}

function decayForGap(earlierMs: number, laterMs: number, everyDays: number): number {
  const diff = calendarDayDiff(laterMs, earlierMs);
  const between = Math.max(0, diff - 1);
  if (between === 0) return 0;
  return Math.floor(between / everyDays);
}

/** XP decay accrued within a single gap (earlier → later), given a behavior's decay config.
 *  Returns 0 when the feature is off, config is invalid, or the gap is too short to accrue decay. */
export function getDecayForGap(earlierMs: number, laterMs: number, decay: BehaviorEntry['xpDecay']): number {
  if (!decay) return 0;
  const everyDays = decayEveryInDays(decay.every, decay.unit);
  if (!Number.isFinite(everyDays) || everyDays <= 0) return 0;
  return decayForGap(earlierMs, laterMs, everyDays);
}

/** Effective log count for a behavior after applying XP decay. Floors at 0.
 *  Returns the raw log count when XP is off (decay is implicitly 0). */
export function getEffectiveLogCount(behavior: BehaviorEntry, now: number = Date.now()): number {
  return Math.max(0, behavior.logs.length - getDecayLogCount(behavior, now));
}

export function getLogXp(log: BehaviorEntry['logs'][number]): number {
  return getLogDurationMinutes(log);
}

export function getBehaviorXp(behavior: BehaviorEntry): number {
  return behavior.logs.reduce((total, log) => total + getLogXp(log), 0);
}

export function getEffectiveXp(behavior: BehaviorEntry, now: number = Date.now()): number {
  const decayXp = behavior.xpEnabled ? getDecayLogCount(behavior, now) * XP_PER_LOG : 0;
  return Math.max(0, getBehaviorXp(behavior) - decayXp);
}

/** Time remaining in the current decay cycle (until the next decay event).
 *  Returns null when XP is off, no decay config, or invalid config.
 *  When the behavior has no logs yet, returns a full cycle (no decay has accrued).
 *
 *  Uses fractional ms diff so the bar shows continuous progress (e.g. 16h after
 *  a 1-day cycle is 33% remaining, not 100%). Note: the actual decay tick uses
 *  calendar-day diff (see `getDecayLogCount`); this is a smoother visual approximation. */
export function getTimeUntilNextDecay(
  behavior: BehaviorEntry,
  now: number = Date.now(),
): {
  daysLeft: number;
  everyDays: number;
  every: number;
  unit: 'days' | 'weeks' | 'months';
} | null {
  if (behavior.xpEnabled !== true) return null;
  const decay = behavior.xpDecay;
  if (!decay) return null;
  const everyDays = decayEveryInDays(decay.every, decay.unit);
  if (!Number.isFinite(everyDays) || everyDays <= 0) return null;

  const lastTimestamp = behavior.lastTimestamp;
  if (lastTimestamp === null) {
    return { daysLeft: everyDays, everyDays, every: decay.every, unit: decay.unit };
  }

  const daysSinceLastLog = Math.max(0, (now - lastTimestamp) / MS_PER_DAY);
  const daysLeft = everyDays - (daysSinceLastLog % everyDays);
  return { daysLeft, everyDays, every: decay.every, unit: decay.unit };
}

/** XP required to advance from level n to level n+1: 25 + 10n + 5n² */
export function xpRequiredForLevel(n: number): number {
  return 25 + 10 * n + 5 * n * n;
}

/** Total XP needed to reach level n (cumulative). */
export function cumulativeXpForLevel(n: number): number {
  if (n <= 0) return 0;
  const sumK = ((n - 1) * n) / 2;
  const sumK2 = ((n - 1) * n * (2 * n - 1)) / 6;
  return 25 * n + 10 * sumK + 5 * sumK2;
}

/** Find the highest level whose cumulative XP ≤ given xp. */
export function getLevel(xp: number): number {
  let n = 0;
  while (cumulativeXpForLevel(n + 1) <= xp) {
    n++;
  }
  return n;
}

/** Progress within the current level (0–1). */
export function getLevelProgress(xp: number): number {
  const level = getLevel(xp);
  const earnedInLevel = xp - cumulativeXpForLevel(level);
  return earnedInLevel / xpRequiredForLevel(level);
}

/** XP earned within the current level. */
export function getLevelXp(xp: number): number {
  const level = getLevel(xp);
  return xp - cumulativeXpForLevel(level);
}

/** XP remaining until the next level. */
export function getXpToNextLevel(xp: number): number {
  const level = getLevel(xp);
  return xpRequiredForLevel(level) - (xp - cumulativeXpForLevel(level));
}
