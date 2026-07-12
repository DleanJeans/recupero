import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import type { TaskEntry } from '../src/types/task';
import {
  formatVnd,
  formatVndAmount,
  getBehaviorMoney,
  getMoneyBalance,
  getMoneyLogTransactions,
  getMoneyRewardAmount,
  getMoneyRewardForLog,
  getMoneyRewardRates,
  getStarMoneyMultiplierForLog,
  getTaskMoney,
  getTotalMoneyEarned,
  getTotalMoneyPenalties,
  getTotalMoneySpent,
  MONEY_PER_LOG,
  MONEY_PER_MINUTE,
  MONEY_PER_TASK_STAR,
} from '../src/utils/money-utils';

function makeBehavior(overrides: Partial<BehaviorEntry> = {}): BehaviorEntry {
  return {
    id: 'behavior-1',
    name: 'Test',
    type: 'neutral',
    lastTimestamp: null,
    metadata: {},
    logs: [],
    cooldownMinutes: 0,
    ...overrides,
  };
}

function makeLog(overrides: Partial<LogEntry> = {}): LogEntry {
  return { id: 'log-1', timestamp: 0, ...overrides };
}

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 'task-1',
    title: 'One-off task',
    scheduledDate: '2024-01-01',
    stars: 1,
    completedDates: [],
    createdAt: 0,
    ...overrides,
  };
}

describe('money-utils', () => {
  it('awards the flat reward for an instant log', () => {
    expect(getMoneyRewardForLog(makeLog())).toBe(MONEY_PER_LOG);
  });

  it('awards the per-minute reward for a timed log', () => {
    expect(getMoneyRewardForLog(makeLog({ endTimestamp: 15 * 60_000 }))).toBe(15 * MONEY_PER_MINUTE);
  });

  it('uses customized per-log and per-minute rates', () => {
    const rates = { perLog: 7_500, perMinute: 250 };
    const behavior = makeBehavior({
      moneyReward: rates,
      type: 'desirable',
      logs: [makeLog(), makeLog({ id: 'log-2', endTimestamp: 4 * 60_000 })],
    });

    expect(getMoneyRewardRates(rates)).toEqual(rates);
    expect(getMoneyRewardForLog(makeLog(), rates)).toBe(7_500);
    expect(getMoneyRewardForLog(makeLog({ endTimestamp: 4 * 60_000 }), rates)).toBe(1_000);
    expect(getBehaviorMoney(behavior)).toBe(8_500);
  });

  it('defaults duration-based money rewards to the per-minute rate', () => {
    expect(getMoneyRewardAmount(undefined, true)).toBe(MONEY_PER_MINUTE);
  });

  it('uses one customized amount as a per-log or per-minute rate', () => {
    const perLog = makeBehavior({
      moneyReward: 7_500,
      type: 'desirable',
      logs: [makeLog(), makeLog({ id: 'log-2', endTimestamp: 4 * 60_000 })],
    });
    const perMinute = makeBehavior({
      moneyReward: 250,
      durationXpEnabled: true,
      type: 'desirable',
      logs: [makeLog({ endTimestamp: 4 * 60_000 })],
    });

    expect(getMoneyRewardAmount(perLog.moneyReward, false)).toBe(7_500);
    expect(getMoneyRewardForLog(perLog.logs[1], perLog.moneyReward, false)).toBe(7_500);
    expect(getMoneyRewardAmount(perMinute.moneyReward, true)).toBe(250);
    expect(getBehaviorMoney(perMinute)).toBe(1_000);
  });

  it('clamps a zero-minute timed log to one rewarded minute', () => {
    expect(getMoneyRewardForLog(makeLog({ endTimestamp: 0 }))).toBe(MONEY_PER_MINUTE);
  });

  it('only counts logs for behaviors with money rewards enabled', () => {
    const rewarded = makeBehavior({
      moneyReward: true,
      type: 'desirable',
      logs: [makeLog(), makeLog({ id: 'log-2', endTimestamp: 5 * 60_000 })],
    });
    const notRewarded = makeBehavior({ logs: [makeLog()] });

    expect(getBehaviorMoney(rewarded)).toBe(MONEY_PER_LOG + 5 * MONEY_PER_MINUTE);
    expect(getTotalMoneyEarned([rewarded, notRewarded])).toBe(MONEY_PER_LOG + 5 * MONEY_PER_MINUTE);
  });

  it('applies star multipliers only when a log earns a new star', () => {
    const logs = [1, 2, 3, 4, 5].map((timestamp, index) => makeLog({ id: `log-${index}`, timestamp }));
    const behavior = makeBehavior({
      moneyReward: true,
      type: 'desirable',
      starThresholds: [1, 3, 5],
      starMoneyMultipliers: [1, 1, 2],
      logs,
    });

    expect(getStarMoneyMultiplierForLog(behavior, logs[0])).toBe(1);
    expect(getStarMoneyMultiplierForLog(behavior, logs[2])).toBe(1);
    expect(getStarMoneyMultiplierForLog(behavior, logs[4])).toBe(2);
    expect(getBehaviorMoney(behavior)).toBe(4 * MONEY_PER_LOG + 2 * MONEY_PER_LOG);
  });

  it('defaults missing star multipliers to one', () => {
    const behavior = makeBehavior({
      moneyReward: true,
      type: 'desirable',
      starThresholds: [1, 3, 5],
      logs: [1, 2, 3, 4, 5].map((timestamp, index) => makeLog({ id: `log-${index}`, timestamp })),
    });

    expect(getBehaviorMoney(behavior)).toBe(5 * MONEY_PER_LOG);
  });

  it('rewards historical logs when the behavior is enabled for money', () => {
    const behavior = makeBehavior({
      moneyReward: true,
      type: 'desirable',
      logs: [
        makeLog({ timestamp: new Date('2024-01-01T12:00:00').getTime() }),
        makeLog({
          id: 'log-2',
          timestamp: new Date('2024-01-02T12:00:00').getTime(),
          endTimestamp: new Date('2024-01-02T12:20:00').getTime(),
        }),
      ],
    });

    expect(getBehaviorMoney(behavior)).toBe(MONEY_PER_LOG + 20 * MONEY_PER_MINUTE);
  });

  it('does not change money for neutral logs', () => {
    const behavior = makeBehavior({ moneyReward: true, type: 'neutral', logs: [makeLog()] });

    expect(getBehaviorMoney(behavior)).toBe(0);
    expect(getTotalMoneyEarned([behavior])).toBe(0);
    expect(getTotalMoneyPenalties([behavior])).toBe(0);
  });

  it('takes the flat reward away for undesirable logs', () => {
    const behavior = makeBehavior({ moneyReward: true, type: 'undesirable', logs: [makeLog()] });

    expect(getBehaviorMoney(behavior)).toBe(-MONEY_PER_LOG);
    expect(getTotalMoneyPenalties([behavior])).toBe(MONEY_PER_LOG);
  });

  it('takes the per-minute reward away for timed undesirable logs', () => {
    const behavior = makeBehavior({
      moneyReward: true,
      type: 'undesirable',
      logs: [makeLog({ endTimestamp: 7 * 60_000 })],
    });

    expect(getBehaviorMoney(behavior)).toBe(-7 * MONEY_PER_MINUTE);
  });

  it('rewards completed one-off tasks based on their stars', () => {
    const oneOff = makeTask({ stars: 3, completedDates: ['2024-01-01', '2024-01-02'] });
    const behaviorTask = makeTask({ source: 'behavior', behaviorId: 'behavior-1', completedDates: ['2024-01-01'] });

    expect(getTaskMoney(oneOff)).toBe(6 * MONEY_PER_TASK_STAR);
    expect(getTaskMoney(behaviorTask)).toBe(0);
    expect(getTotalMoneyEarned([], [oneOff, behaviorTask])).toBe(6 * MONEY_PER_TASK_STAR);
    expect(getMoneyBalance([], [], [oneOff])).toBe(6 * MONEY_PER_TASK_STAR);
  });

  it('subtracts purchases without allowing a negative balance', () => {
    const behavior = makeBehavior({ moneyReward: true, type: 'desirable', logs: [makeLog()] });
    const penalty = makeBehavior({ moneyReward: true, type: 'undesirable', logs: [makeLog()] });

    expect(getTotalMoneySpent([{ cost: 1_000 }, { cost: 2_000 }])).toBe(3_000);
    expect(getMoneyBalance([behavior], [{ cost: 1_000 }])).toBe(4_000);
    expect(getMoneyBalance([behavior, penalty], [{ cost: 1_000 }])).toBe(0);
    expect(getMoneyBalance([behavior], [{ cost: 10_000 }])).toBe(0);
  });

  it('builds behavior money transactions with the balance after each log', () => {
    const earned = makeBehavior({
      id: 'earned-behavior',
      moneyReward: true,
      type: 'desirable',
      logs: [makeLog({ id: 'earned-log', timestamp: 1_000 })],
    });
    const lost = makeBehavior({
      id: 'lost-behavior',
      moneyReward: true,
      type: 'undesirable',
      logs: [makeLog({ id: 'lost-log', timestamp: 3_000 })],
    });

    const transactions = getMoneyLogTransactions([earned, lost], [{ cost: 1_000, purchasedAt: 2_000 }]);

    expect(transactions.map(({ amount, balanceAfter }) => ({ amount, balanceAfter }))).toEqual([
      { amount: -MONEY_PER_LOG, balanceAfter: 0 },
      { amount: MONEY_PER_LOG, balanceAfter: MONEY_PER_LOG },
    ]);
  });

  it('builds money transactions for completed one-off tasks', () => {
    const task = makeTask({ stars: 2, completedDates: ['2024-01-01'] });

    const transactions = getMoneyLogTransactions([], [], [task]);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      source: 'task',
      taskId: task.id,
      taskTitle: task.title,
      amount: 2 * MONEY_PER_TASK_STAR,
      balanceAfter: 2 * MONEY_PER_TASK_STAR,
    });
  });

  it('formats Vietnamese dong with the ₫ symbol', () => {
    expect(formatVnd(5_000)).toBe('5,000 ₫');
  });

  it('formats a Vietnamese dong input with separators', () => {
    expect(formatVndAmount(5_000)).toBe('5,000');
  });
});
