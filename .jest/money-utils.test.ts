import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import {
  formatVnd,
  getBehaviorMoney,
  getMoneyBalance,
  getMoneyRewardForLog,
  getTotalMoneyEarned,
  getTotalMoneyPenalties,
  getTotalMoneySpent,
  MONEY_PER_LOG,
  MONEY_PER_MINUTE,
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

describe('money-utils', () => {
  it('awards the flat reward for an instant log', () => {
    expect(getMoneyRewardForLog(makeLog())).toBe(MONEY_PER_LOG);
  });

  it('awards the per-minute reward for a timed log', () => {
    expect(getMoneyRewardForLog(makeLog({ endTimestamp: 15 * 60_000 }))).toBe(15 * MONEY_PER_MINUTE);
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

  it('subtracts purchases without allowing a negative balance', () => {
    const behavior = makeBehavior({ moneyReward: true, type: 'desirable', logs: [makeLog()] });
    const penalty = makeBehavior({ moneyReward: true, type: 'undesirable', logs: [makeLog()] });

    expect(getTotalMoneySpent([{ cost: 1_000 }, { cost: 2_000 }])).toBe(3_000);
    expect(getMoneyBalance([behavior], [{ cost: 1_000 }])).toBe(4_000);
    expect(getMoneyBalance([behavior, penalty], [{ cost: 1_000 }])).toBe(0);
    expect(getMoneyBalance([behavior], [{ cost: 10_000 }])).toBe(0);
  });

  it('formats Vietnamese dong with the ₫ symbol', () => {
    expect(formatVnd(5_000)).toBe('5,000 ₫');
  });
});
