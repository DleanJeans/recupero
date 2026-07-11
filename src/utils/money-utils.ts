import type { BehaviorEntry, LogEntry, MoneyRewardRates } from '../types/behavior';
import { getLogDurationMinutes, hasTimedLogRange } from './log-utils';

export const MONEY_PER_LOG = 5_000;
export const MONEY_PER_MINUTE = 1_000;
export const VND_SYMBOL = '₫';
export const DEFAULT_MONEY_REWARD = { perLog: MONEY_PER_LOG, perMinute: MONEY_PER_MINUTE } as const;

function normalizeMoneyRate(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

export function getMoneyRewardRates(reward: BehaviorEntry['moneyReward']): MoneyRewardRates {
  if (reward == null || reward === true) return { ...DEFAULT_MONEY_REWARD };
  return {
    perLog: normalizeMoneyRate(reward.perLog, MONEY_PER_LOG),
    perMinute: normalizeMoneyRate(reward.perMinute, MONEY_PER_MINUTE),
  };
}

export function getMoneyRewardForLog(log: LogEntry, rates: MoneyRewardRates = DEFAULT_MONEY_REWARD): number {
  if (!hasTimedLogRange(log)) return rates.perLog;
  return getLogDurationMinutes(log) * rates.perMinute;
}

export function getBehaviorMoney(behavior: BehaviorEntry): number {
  if (behavior.moneyReward == null || behavior.type === 'neutral') return 0;

  const rates = getMoneyRewardRates(behavior.moneyReward);
  const total = behavior.logs.reduce((sum, log) => sum + getMoneyRewardForLog(log, rates), 0);
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

export function sanitizeVndInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseVndInput(value: string): number {
  return Number(sanitizeVndInput(value));
}
