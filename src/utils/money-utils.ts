import type { BehaviorEntry, LogEntry } from '../types/behavior';
import { getLogDurationMinutes, hasTimedLogRange } from './log-utils';

export const MONEY_PER_LOG = 5_000;
export const MONEY_PER_MINUTE = 1_000;
export const VND_SYMBOL = '₫';

export function getMoneyRewardForLog(log: LogEntry): number {
  if (!hasTimedLogRange(log)) return MONEY_PER_LOG;
  return getLogDurationMinutes(log) * MONEY_PER_MINUTE;
}

export function getBehaviorMoney(behavior: BehaviorEntry): number {
  if (behavior.moneyReward !== true) return 0;
  return behavior.logs.reduce((total, log) => total + getMoneyRewardForLog(log), 0);
}

export function getTotalMoneyEarned(behaviors: BehaviorEntry[]): number {
  return behaviors.reduce((total, behavior) => total + getBehaviorMoney(behavior), 0);
}

export function getTotalMoneySpent(purchases: ReadonlyArray<{ cost: number }>): number {
  return purchases.reduce((total, purchase) => total + Math.max(0, purchase.cost), 0);
}

export function getMoneyBalance(behaviors: BehaviorEntry[], purchases: ReadonlyArray<{ cost: number }>): number {
  return Math.max(0, getTotalMoneyEarned(behaviors) - getTotalMoneySpent(purchases));
}

export function formatVnd(amount: number): string {
  return `${Math.max(0, Math.round(amount)).toLocaleString('en-US')} ${VND_SYMBOL}`;
}
