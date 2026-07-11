import type { BehaviorEntry, LogEntry, MoneyRewardRates } from '../types/behavior';
import type { TaskEntry } from '../types/task';
import { getLogDurationMinutes, getLogEndTimestamp, hasTimedLogRange } from './log-utils';
import { isOneOffTask, timestampForTaskDate } from './task-utils';

export const MONEY_PER_LOG = 5_000;
export const MONEY_PER_MINUTE = 1_000;
export const MONEY_PER_TASK_STAR = 5_000;
export const VND_SYMBOL = '₫';
export const DEFAULT_MONEY_REWARD = { perLog: MONEY_PER_LOG, perMinute: MONEY_PER_MINUTE } as const;

interface MoneyLogTransactionBase {
  id: string;
  amount: number;
  balanceAfter: number;
}

export interface BehaviorMoneyLogTransaction extends MoneyLogTransactionBase {
  source: 'behavior';
  behaviorId: string;
  behaviorName: string;
  log: LogEntry;
}

export interface TaskMoneyLogTransaction extends MoneyLogTransactionBase {
  source: 'task';
  taskId: string;
  taskTitle: string;
  completedAt: number;
}

export type MoneyLogTransaction = BehaviorMoneyLogTransaction | TaskMoneyLogTransaction;

function normalizeMoneyRate(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

export function getMoneyRewardRates(reward: BehaviorEntry['moneyReward']): MoneyRewardRates {
  if (reward == null || reward === true || typeof reward === 'number') return { ...DEFAULT_MONEY_REWARD };
  return {
    perLog: normalizeMoneyRate(reward.perLog, MONEY_PER_LOG),
    perMinute: normalizeMoneyRate(reward.perMinute, MONEY_PER_MINUTE),
  };
}

export function getMoneyRewardAmount(reward: BehaviorEntry['moneyReward'], durationBased = false): number {
  const fallback = durationBased ? MONEY_PER_MINUTE : MONEY_PER_LOG;
  if (typeof reward === 'number') return normalizeMoneyRate(reward, fallback);
  if (reward == null || reward === true) return fallback;
  return normalizeMoneyRate(durationBased ? reward.perMinute : reward.perLog, fallback);
}

export function getMoneyRewardForLog(
  log: LogEntry,
  reward: BehaviorEntry['moneyReward'] = DEFAULT_MONEY_REWARD,
  durationBased = false,
): number {
  if (reward === true) return getMoneyRewardForLog(log, DEFAULT_MONEY_REWARD);
  if (reward != null && typeof reward === 'object') {
    if (!hasTimedLogRange(log)) return normalizeMoneyRate(reward.perLog, MONEY_PER_LOG);
    return getLogDurationMinutes(log) * normalizeMoneyRate(reward.perMinute, MONEY_PER_MINUTE);
  }

  const amount = getMoneyRewardAmount(reward, durationBased);
  if (!durationBased || !hasTimedLogRange(log)) return amount;
  return getLogDurationMinutes(log) * amount;
}

export function getBehaviorMoney(behavior: BehaviorEntry): number {
  if (behavior.moneyReward == null || behavior.type === 'neutral') return 0;

  const durationBased = behavior.durationXpEnabled === true;
  const total = behavior.logs.reduce(
    (sum, log) => sum + getMoneyRewardForLog(log, behavior.moneyReward, durationBased),
    0,
  );
  return behavior.type === 'undesirable' ? -total : total;
}

export function getTaskMoney(task: TaskEntry): number {
  if (!isOneOffTask(task)) return 0;
  return task.completedDates.length * task.stars * MONEY_PER_TASK_STAR;
}

export function getTotalMoneyEarned(behaviors: BehaviorEntry[], tasks: ReadonlyArray<TaskEntry> = []): number {
  return (
    behaviors.reduce((total, behavior) => total + Math.max(0, getBehaviorMoney(behavior)), 0) +
    tasks.reduce((total, task) => total + getTaskMoney(task), 0)
  );
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

export function getMoneyBalance(
  behaviors: BehaviorEntry[],
  purchases: ReadonlyArray<{ cost: number }>,
  tasks: ReadonlyArray<TaskEntry> = [],
): number {
  return Math.max(
    0,
    getTotalMoneyEarned(behaviors, tasks) - getTotalMoneyPenalties(behaviors) - getTotalMoneySpent(purchases),
  );
}

export function getMoneyLogTransactions(
  behaviors: BehaviorEntry[],
  purchases: ReadonlyArray<{ cost: number; purchasedAt: number }>,
  tasks: ReadonlyArray<TaskEntry> = [],
): MoneyLogTransaction[] {
  const events: Array<
    | {
        timestamp: number;
        order: number;
        amount: number;
        transaction: Omit<BehaviorMoneyLogTransaction, 'balanceAfter'> | Omit<TaskMoneyLogTransaction, 'balanceAfter'>;
      }
    | { timestamp: number; order: number; amount: number }
  > = [];
  let order = 0;

  for (const behavior of behaviors) {
    if (behavior.moneyReward == null || behavior.type === 'neutral') continue;

    for (const log of behavior.logs) {
      const reward = getMoneyRewardForLog(log, behavior.moneyReward, behavior.durationXpEnabled === true);
      const amount = behavior.type === 'undesirable' ? -reward : reward;
      if (amount === 0) continue;

      events.push({
        timestamp: getLogEndTimestamp(log),
        order: order++,
        amount,
        transaction: {
          id: `${behavior.id}:${log.id}`,
          source: 'behavior',
          behaviorId: behavior.id,
          behaviorName: behavior.name,
          log,
          amount,
        },
      });
    }
  }

  for (const task of tasks) {
    if (!isOneOffTask(task)) continue;

    for (const completedDate of task.completedDates) {
      const timestamp = timestampForTaskDate(completedDate);
      events.push({
        timestamp,
        order: order++,
        amount: task.stars * MONEY_PER_TASK_STAR,
        transaction: {
          id: `task:${task.id}:${completedDate}`,
          source: 'task',
          taskId: task.id,
          taskTitle: task.title,
          completedAt: timestamp,
          amount: task.stars * MONEY_PER_TASK_STAR,
        },
      });
    }
  }

  for (const purchase of purchases) {
    const amount = Number.isFinite(purchase.cost) ? -Math.max(0, purchase.cost) : 0;
    if (amount === 0) continue;
    events.push({ timestamp: purchase.purchasedAt, order: order++, amount });
  }

  events.sort((a, b) => a.timestamp - b.timestamp || a.order - b.order);

  let rawBalance = 0;
  const transactions: MoneyLogTransaction[] = [];
  for (const event of events) {
    rawBalance += event.amount;
    if ('transaction' in event) {
      transactions.push({ ...event.transaction, balanceAfter: Math.max(0, rawBalance) });
    }
  }

  return transactions.reverse();
}

export function formatVnd(amount: number): string {
  return `${formatVndAmount(amount)} ${VND_SYMBOL}`;
}

export function formatVndAmount(amount: number): string {
  const normalizedAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return normalizedAmount.toLocaleString('en-US');
}

export function sanitizeVndInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseVndInput(value: string): number {
  return Number(sanitizeVndInput(value));
}
