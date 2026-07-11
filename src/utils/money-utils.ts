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
  if (behavior.moneyReward !== true || behavior.type === 'neutral') return 0;

  const total = behavior.logs.reduce((sum, log) => sum + getMoneyRewardForLog(log), 0);
  return behavior.type === 'undesirable' ? -total : total;
}

export function getTotalMoneyEarned(behaviors: BehaviorEntry[]): number {
  return behaviors.reduce((total, behavior) => total + Math.max(0, getBehaviorMoney(behavior)), 0);
}

export function getTotalMoneyPenalties(behaviors: BehaviorEntry[]): number {
  return behaviors.reduce((total, behavior) => total + Math.max(0, -getBehaviorMoney(behavior)), 0);
}

export function getTotalMoneySpent(purchases: ReadonlyArray<{ cost: number }>): number {
  return purchases.reduce(
    (total, purchase) => total + (Number.isFinite(purchase.cost) ? Math.max(0, purchase.cost) : 0),
    0,
  );
}

export function getMoneyBalance(behaviors: BehaviorEntry[], purchases: ReadonlyArray<{ cost: number }>): number {
  return Math.max(
    0,
    getTotalMoneyEarned(behaviors) - getTotalMoneyPenalties(behaviors) - getTotalMoneySpent(purchases),
  );
}

export function formatVnd(amount: number): string {
  const normalizedAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${normalizedAmount.toLocaleString('en-US')} ${VND_SYMBOL}`;
}

export function parseVndInput(value: string): number {
  return Number(value.replace(/\D/g, ''));
}
