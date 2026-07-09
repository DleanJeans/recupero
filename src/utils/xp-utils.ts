import type { BehaviorEntry, LogEntry, XpDecayUnit } from '../types/behavior';
import { MS_PER_DAY, operationalDayDiff } from './date-utils';
import { getLogDurationMinutes, getLogEndTimestamp, getLogStartTimestamp, LEGACY_LOG_XP } from './log-utils';

export const XP_PER_LOG = LEGACY_LOG_XP;
const MS_PER_HOUR = 60 * 60 * 1000;
const behaviorXpCache = new WeakMap<LogEntry[], number>();
const chronologicalLogsCache = new WeakMap<LogEntry[], LogEntry[]>();

/** Convert a `xpDecay.unit` + `every` to a day count. */
export function decayEveryInDays(every: number, unit: XpDecayUnit): number {
  if (unit === 'hours') return every / 24;
  if (unit === 'days') return every;
  if (unit === 'weeks') return every * 7;
  return every * 30; // months → 30-day approximation
}

function decayEveryInMs(every: number, unit: XpDecayUnit): number {
  if (unit === 'hours') return every * MS_PER_HOUR;
  return decayEveryInDays(every, unit) * MS_PER_DAY;
}

/** Number of "log equivalents" lost to XP decay across the behavior's lifetime,
 *  computed on read.
 *
 *  Day/week/month settings require `every` logs in each completed period and
 *  lose one log for each period that misses that threshold. Hourly settings
 *  keep the old elapsed-cycle behavior. Returns 0 when the feature is off, no
 *  logs exist, or no decay has accrued. */
export function getDecayLogCount(behavior: BehaviorEntry, now: number = Date.now(), dayCutoffHour = 0): number {
  const { xpDecay, logs } = behavior;
  if (!behavior.xpEnabled) return 0;
  if (!xpDecay) return 0;
  if (logs.length === 0) return 0;

  if (!isValidDecay(xpDecay)) return 0;

  const sorted = getChronologicalLogs(logs);
  const N = sorted.length;

  if (xpDecay.unit !== 'hours') {
    const everyDays = decayEveryInDays(1, xpDecay.unit);
    return Math.min(
      N - getProtectedLatestPeriodLogCount(sorted, now, xpDecay, everyDays, dayCutoffHour),
      decayForCompletedPeriods(sorted, now, xpDecay, everyDays, dayCutoffHour),
    );
  }

  let decayLogCount = 0;
  for (let i = 1; i < N; i++) {
    decayLogCount += decayForGap(
      getLogEndTimestamp(sorted[i - 1]),
      getLogStartTimestamp(sorted[i]),
      xpDecay,
      dayCutoffHour,
    );
  }

  // Final gap: most recent log → now. Caps at N since we can't cancel more logs than exist.
  const finalDecay = decayForGap(getLogEndTimestamp(sorted[N - 1]), now, xpDecay, dayCutoffHour, true);
  return Math.min(
    N - getProtectedLatestLogCount(sorted, xpDecay, finalDecay, dayCutoffHour),
    decayLogCount + finalDecay,
  );
}

function isValidDecay(decay: BehaviorEntry['xpDecay']): decay is NonNullable<BehaviorEntry['xpDecay']> {
  return !!decay && Number.isFinite(decay.every) && decay.every > 0;
}

function decayForGap(
  earlierMs: number,
  laterMs: number,
  decay: NonNullable<BehaviorEntry['xpDecay']>,
  dayCutoffHour = 0,
  includeLaterDay = false,
): number {
  if (decay.unit === 'hours') {
    const everyMs = decayEveryInMs(decay.every, decay.unit);
    if (!Number.isFinite(everyMs) || everyMs <= 0) return 0;
    return Math.floor(Math.max(0, laterMs - earlierMs) / everyMs);
  }

  const everyDays = decayEveryInDays(1, decay.unit);
  const diff = operationalDayDiff(laterMs, earlierMs, dayCutoffHour);
  const elapsedPeriods = Math.floor(diff / everyDays) - (includeLaterDay ? 0 : 1);
  return Math.max(0, elapsedPeriods);
}

/** XP decay accrued within a single gap (earlier → later), given a behavior's decay config.
 *  Returns 0 when the feature is off, config is invalid, or the gap is too short to accrue decay. */
export function getDecayForGap(
  earlierMs: number,
  laterMs: number,
  decay: BehaviorEntry['xpDecay'],
  dayCutoffHour = 0,
): number {
  if (!isValidDecay(decay)) return 0;
  return decayForGap(earlierMs, laterMs, decay, dayCutoffHour);
}

function getProtectedLatestLogCount(
  sorted: LogEntry[],
  decay: NonNullable<BehaviorEntry['xpDecay']>,
  finalDecay: number,
  dayCutoffHour: number,
): number {
  if (finalDecay > 0) return 0;

  let count = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const gapDecay = decayForGap(
      getLogEndTimestamp(sorted[i - 1]),
      getLogStartTimestamp(sorted[i]),
      decay,
      dayCutoffHour,
    );
    if (gapDecay > 0) break;
    count += 1;
  }
  return count;
}

/** Effective log count for a behavior after applying XP decay. Floors at 0.
 *  Returns the raw log count when XP is off (decay is implicitly 0). */
export function getEffectiveLogCount(behavior: BehaviorEntry, now: number = Date.now(), dayCutoffHour = 0): number {
  return Math.max(0, behavior.logs.length - getDecayLogCount(behavior, now, dayCutoffHour));
}

export function getDecayedLogs(behavior: BehaviorEntry, now: number = Date.now(), dayCutoffHour = 0): LogEntry[] {
  const decayLogCount = getDecayLogCount(behavior, now, dayCutoffHour);
  if (decayLogCount <= 0) return [];
  return getChronologicalLogs(behavior.logs).slice(0, decayLogCount);
}

export function getLogXp(log: BehaviorEntry['logs'][number]): number {
  return getLogDurationMinutes(log);
}

export function getBehaviorXp(behavior: BehaviorEntry): number {
  const cached = behaviorXpCache.get(behavior.logs);
  if (cached !== undefined) return cached;

  const xp = behavior.logs.reduce((total, log) => total + getLogXp(log), 0);
  behaviorXpCache.set(behavior.logs, xp);
  return xp;
}

function getChronologicalLogs(logs: LogEntry[]): LogEntry[] {
  if (logs.length < 2) return logs;

  const cached = chronologicalLogsCache.get(logs);
  if (cached) return cached;

  let alreadySorted = true;
  for (let i = 1; i < logs.length; i++) {
    if (getLogStartTimestamp(logs[i - 1]) > getLogStartTimestamp(logs[i])) {
      alreadySorted = false;
      break;
    }
  }

  const chronologicalLogs = alreadySorted
    ? logs
    : [...logs].sort((a, b) => getLogStartTimestamp(a) - getLogStartTimestamp(b));
  chronologicalLogsCache.set(logs, chronologicalLogs);
  return chronologicalLogs;
}

export function getEffectiveXp(behavior: BehaviorEntry, now: number = Date.now(), dayCutoffHour = 0): number {
  const decayXp = behavior.xpEnabled
    ? getDecayedLogs(behavior, now, dayCutoffHour).reduce((total, log) => total + getLogXp(log), 0)
    : 0;
  return Math.max(0, getBehaviorXp(behavior) - decayXp);
}

export function getHighestEffectiveXp(behavior: BehaviorEntry, now: number = Date.now(), dayCutoffHour = 0): number {
  if (!behavior.xpEnabled || !behavior.xpDecay || behavior.logs.length === 0) {
    return getBehaviorXp(behavior);
  }

  const sorted = getChronologicalLogs(behavior.logs);
  if (behavior.xpDecay.unit !== 'hours') {
    let highestXp = getEffectiveXp(behavior, now, dayCutoffHour);
    for (let i = 0; i < sorted.length; i++) {
      highestXp = Math.max(
        highestXp,
        getEffectiveXp({ ...behavior, logs: sorted.slice(0, i + 1) }, getLogEndTimestamp(sorted[i]), dayCutoffHour),
      );
    }
    return highestXp;
  }

  let highestXp = getEffectiveXp(behavior, now, dayCutoffHour);
  let decayLogCount = 0;
  let protectedLatestLogCount = 1;
  const prefixXp = [0];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gapDecay = decayForGap(
        getLogEndTimestamp(sorted[i - 1]),
        getLogStartTimestamp(sorted[i]),
        behavior.xpDecay,
        dayCutoffHour,
      );
      decayLogCount += gapDecay;
      protectedLatestLogCount = gapDecay > 0 ? 1 : protectedLatestLogCount + 1;
    }
    prefixXp.push(prefixXp[i] + getLogXp(sorted[i]));
    const cappedDecayLogCount = Math.min(decayLogCount, i + 1 - protectedLatestLogCount);
    highestXp = Math.max(highestXp, prefixXp[i + 1] - prefixXp[cappedDecayLogCount]);
  }

  return highestXp;
}

function decayForCompletedPeriods(
  sorted: LogEntry[],
  now: number,
  decay: NonNullable<BehaviorEntry['xpDecay']>,
  everyDays: number,
  dayCutoffHour: number,
): number {
  const firstPeriod = decayPeriodIndex(getLogStartTimestamp(sorted[0]), everyDays, dayCutoffHour);
  const currentPeriod = decayPeriodIndex(now, everyDays, dayCutoffHour);
  if (currentPeriod <= firstPeriod) return 0;

  const counts = new Map<number, number>();
  for (const log of sorted) {
    const period = decayPeriodIndex(getLogStartTimestamp(log), everyDays, dayCutoffHour);
    if (period < firstPeriod || period >= currentPeriod) continue;
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }

  let failedPeriods = 0;
  for (let period = firstPeriod; period < currentPeriod; period++) {
    if ((counts.get(period) ?? 0) < decay.every) failedPeriods++;
  }
  return failedPeriods;
}

function getProtectedLatestPeriodLogCount(
  sorted: LogEntry[],
  now: number,
  decay: NonNullable<BehaviorEntry['xpDecay']>,
  everyDays: number,
  dayCutoffHour: number,
): number {
  const counts = new Map<number, number>();
  for (const log of sorted) {
    const period = decayPeriodIndex(getLogStartTimestamp(log), everyDays, dayCutoffHour);
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }

  const currentPeriod = decayPeriodIndex(now, everyDays, dayCutoffHour);
  let period = decayPeriodIndex(getLogStartTimestamp(sorted[sorted.length - 1]), everyDays, dayCutoffHour);
  let protectedCount = 0;
  if (period < currentPeriod - 1) return 0;

  while (period <= currentPeriod) {
    const count = counts.get(period) ?? 0;
    if (count === 0) break;
    if (period !== currentPeriod && count < decay.every) break;
    protectedCount += count;
    period -= 1;
  }

  return protectedCount;
}

function decayPeriodIndex(timestamp: number, everyDays: number, dayCutoffHour: number): number {
  return Math.floor(operationalDayDiff(timestamp, 0, dayCutoffHour) / everyDays);
}

/** Time remaining in the current decay cycle (until the next decay event).
 *  Returns null when XP is off, no decay config, or invalid config.
 *  When the behavior has no logs yet, returns a full cycle (no decay has accrued).
 *
 *  Uses fractional ms diff so the bar shows continuous progress (e.g. 16h after
 *  a 1-day cycle is 33% remaining, not 100%). Note: the actual decay tick uses
 *  calendar-day diff for day/week/month settings (see `getDecayLogCount`);
 *  this is a smoother visual approximation. */
export function getTimeUntilNextDecay(
  behavior: BehaviorEntry,
  now: number = Date.now(),
): {
  daysLeft: number;
  everyDays: number;
  every: number;
  unit: XpDecayUnit;
} | null {
  if (behavior.xpEnabled !== true) return null;
  const decay = behavior.xpDecay;
  if (!isValidDecay(decay)) return null;
  const everyDays =
    decay.unit === 'hours' ? decayEveryInDays(decay.every, decay.unit) : decayEveryInDays(1, decay.unit);
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
