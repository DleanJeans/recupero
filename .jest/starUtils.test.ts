import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import { getEarnedStars, getLogsForDate, getThresholds, getTotalStarsForDate } from '../src/utils/starUtils';

function makeBehavior(overrides: Partial<BehaviorEntry> = {}): BehaviorEntry {
  return {
    id: 'b1',
    name: 'Test',
    type: 'neutral',
    lastTimestamp: null,
    metadata: {},
    logs: [],
    cooldownMinutes: 0,
    ...overrides,
  };
}

function makeLog(timestamp: number): LogEntry {
  return { id: `l-${timestamp}`, timestamp };
}

describe('getThresholds', () => {
  it('returns the stored thresholds when defined', () => {
    expect(getThresholds(makeBehavior({ starThresholds: [10, 20, 30] }))).toEqual([10, 20, 30]);
  });

  it('returns undefined when starThresholds is not set', () => {
    expect(getThresholds(makeBehavior())).toBeUndefined();
  });
});

describe('getEarnedStars', () => {
  const t: [number, number, number] = [1, 3, 5];

  it('returns 0 for zero logs', () => {
    expect(getEarnedStars(0, t)).toBe(0);
  });

  it('returns 1 at the first threshold', () => {
    expect(getEarnedStars(1, t)).toBe(1);
  });

  it('returns 1 between thresholds', () => {
    expect(getEarnedStars(2, t)).toBe(1);
  });

  it('returns 2 at the second threshold', () => {
    expect(getEarnedStars(3, t)).toBe(2);
  });

  it('returns 3 at the third threshold', () => {
    expect(getEarnedStars(5, t)).toBe(3);
  });

  it('caps at 3 above the third threshold', () => {
    expect(getEarnedStars(7, t)).toBe(3);
    expect(getEarnedStars(9999, t)).toBe(3);
  });

  it('works with custom thresholds', () => {
    const custom: [number, number, number] = [10, 30, 60];
    expect(getEarnedStars(0, custom)).toBe(0);
    expect(getEarnedStars(10, custom)).toBe(1);
    expect(getEarnedStars(35, custom)).toBe(2);
    expect(getEarnedStars(60, custom)).toBe(3);
  });

  it('handles invalid input safely', () => {
    expect(getEarnedStars(NaN, t)).toBe(0);
    expect(getEarnedStars(-3, t)).toBe(0);
    expect(getEarnedStars(Number.POSITIVE_INFINITY, t)).toBe(3);
  });
});

describe('getLogsForDate', () => {
  // Use a fixed reference "today" in local time to avoid TZ flakiness.
  const today = new Date(2026, 5, 20, 14, 30, 0);
  const todayStr = '2026-06-20';
  const yesterdayStr = '2026-06-19';

  beforeAll(() => {
    jest.useFakeTimers({ now: today });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns only logs whose timestamp matches the date', () => {
    const todayTs = today.getTime();
    const yesterdayTs = todayTs - 86_400_000;
    const behavior = makeBehavior({
      logs: [makeLog(yesterdayTs), makeLog(todayTs - 1_000), makeLog(todayTs + 3_600_000)],
    });

    const todayLogs = getLogsForDate(behavior, todayStr);
    expect(todayLogs.map(l => l.timestamp)).toEqual([todayTs - 1_000, todayTs + 3_600_000]);

    const yLogs = getLogsForDate(behavior, yesterdayStr);
    expect(yLogs.map(l => l.timestamp)).toEqual([yesterdayTs]);
  });

  it('returns empty array when no logs match', () => {
    expect(getLogsForDate(makeBehavior(), todayStr)).toEqual([]);
  });
});

describe('getTotalStarsForDate', () => {
  const today = new Date(2026, 5, 20, 14, 30, 0);
  const todayStr = '2026-06-20';

  beforeAll(() => {
    jest.useFakeTimers({ now: today });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns 0 for an empty array', () => {
    expect(getTotalStarsForDate([], todayStr)).toBe(0);
  });

  it('returns 0 when no behaviors have opted in', () => {
    const behaviors = [
      makeBehavior({ id: 'a', logs: [makeLog(today.getTime())] }),
      makeBehavior({ id: 'b', logs: [makeLog(today.getTime())] }),
    ];
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(0);
  });

  it('sums earned stars across opted-in behaviors', () => {
    const ts = today.getTime();
    const behaviors = [
      makeBehavior({ id: 'a', starThresholds: [1, 3, 5], logs: [makeLog(ts)] }), // 1
      makeBehavior({ id: 'b', starThresholds: [1, 3, 5], logs: [makeLog(ts), makeLog(ts), makeLog(ts)] }), // 2
      makeBehavior({
        id: 'c',
        starThresholds: [1, 3, 5],
        logs: [makeLog(ts), makeLog(ts), makeLog(ts), makeLog(ts), makeLog(ts)],
      }), // 3
    ];
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(6);
  });

  it('ignores non-opted-in behaviors when summing', () => {
    const ts = today.getTime();
    const behaviors = [
      makeBehavior({ id: 'a', starThresholds: [1, 3, 5], logs: [makeLog(ts)] }), // 1
      makeBehavior({ id: 'b', logs: [makeLog(ts), makeLog(ts), makeLog(ts)] }), // not opted in
    ];
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(1);
  });

  it('returns 0 when no logs were created on the date', () => {
    const behaviors = [
      makeBehavior({ id: 'a', starThresholds: [1, 3, 5], logs: [] }),
      makeBehavior({ id: 'b', starThresholds: [1, 3, 5], logs: [makeLog(today.getTime() - 86_400_000)] }),
    ];
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(0);
  });
});
