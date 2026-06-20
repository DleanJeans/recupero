import type { BehaviorEntry, XpDecayUnit } from '../types/behavior';
import { calendarDayDiff } from './dateUtils';

export const XP_PER_LOG = 5;

/** Convert a `xpDecay.unit` + `every` to a day count. */
export function decayEveryInDays(every: number, unit: XpDecayUnit): number {
  if (unit === 'days') return every;
  if (unit === 'weeks') return every * 7;
  return every * 30; // months → 30-day approximation
}

/** Number of "log equivalents" lost to XP decay since the last log, computed on read.
 *  Returns 0 when the feature is off, no logs exist, or no decay has accrued.
 *
 *  Counts days *strictly between* the last log and now (excludes both endpoints),
 *  so a same-day or 1-day-apart log never decays. Example: logged Wed, today Fri
 *  crosses one day (Thu) → 1 log lost per `every` day. */
export function getDecayLogCount(behavior: BehaviorEntry, now: number = Date.now()): number {
  const { xpDecay, lastTimestamp } = behavior;
  if (!xpDecay || lastTimestamp === null) return 0;

  const calendarDiff = calendarDayDiff(now, lastTimestamp);
  const daysBetween = Math.max(0, calendarDiff - 1);
  if (daysBetween === 0) return 0;

  const everyDays = decayEveryInDays(xpDecay.every, xpDecay.unit);
  if (!Number.isFinite(everyDays) || everyDays <= 0) return 0;

  return Math.floor(daysBetween / everyDays);
}

/** Effective log count for a behavior after applying XP decay. Floors at 0. */
export function getEffectiveLogCount(behavior: BehaviorEntry, now: number = Date.now()): number {
  return Math.max(0, behavior.logs.length - getDecayLogCount(behavior, now));
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

export function getXp(logCount: number): number {
  return logCount * XP_PER_LOG;
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
