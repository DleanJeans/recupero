import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import {
  getEarnedStars,
  getLogsForDate,
  getLogsForPeriod,
  getPeriodRange,
  getStarPeriod,
  getThresholds,
  getTotalStarsForDate,
} from '../src/utils/starUtils';

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

describe('getEarnedStars with null slots', () => {
  it('skips a null middle slot — [1, null, 5] at 3 logs earns 1', () => {
    expect(getEarnedStars(3, [1, null, 5])).toBe(1);
  });

  it('skips a null middle slot — [1, null, 5] at 5 logs earns 2', () => {
    expect(getEarnedStars(5, [1, null, 5])).toBe(3);
  });

  it('skips a null first slot — [null, 3, 5] at 5 logs earns 2', () => {
    expect(getEarnedStars(5, [null, 3, 5])).toBe(3);
  });

  it('skips a null first slot — [null, 3, 5] at 2 logs earns 0', () => {
    expect(getEarnedStars(2, [null, 3, 5])).toBe(0);
  });

  it('skips a null last slot — [1, 3, null] at 5 logs earns 2', () => {
    expect(getEarnedStars(5, [1, 3, null])).toBe(2);
  });

  it('caps at the number of non-null slots', () => {
    // Two real thresholds → cap is 2, not 3.
    expect(getEarnedStars(9999, [1, 3, null])).toBe(2);
    expect(getEarnedStars(9999, [null, 3, 5])).toBe(3);
    expect(getEarnedStars(9999, [1, null, 5])).toBe(3);
  });

  it('returns 0 when all slots are null', () => {
    expect(getEarnedStars(10, [null, null, null])).toBe(0);
  });

  it('handles multiple null slots', () => {
    expect(getEarnedStars(5, [1, null, null])).toBe(1);
    expect(getEarnedStars(5, [null, null, 5])).toBe(3);
    expect(getEarnedStars(5, [null, 3, null])).toBe(2);
  });

  it('handles an empty thresholds array', () => {
    expect(getEarnedStars(10, [])).toBe(0);
  });

  it('treats null as a non-threshold when at the boundary', () => {
    // logCount exactly equal to a real threshold counts; null slots
    // never match because there is no number to compare against.
    expect(getEarnedStars(3, [1, null, 5])).toBe(1);
    expect(getEarnedStars(1, [1, null, 5])).toBe(1);
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

  it('mixes per-behavior periods: daily + weekly + monthly totals all add up', () => {
    // today = Sat June 20 2026. Sun-Sat week = June 14–20. June 1–30.
    const ts = today.getTime();
    const weekStartTs = new Date(2026, 5, 14, 12).getTime();
    const monthStartTs = new Date(2026, 5, 1, 12).getTime();
    const behaviors = [
      // 1 log today, daily period → 1 star ([1, 3, 5])
      makeBehavior({ id: 'a', starThresholds: [1, 3, 5], starPeriod: 'day', logs: [makeLog(ts)] }),
      // 5 logs in the current week (incl. 2 today), weekly period → 1 star ([1, 10, 20])
      makeBehavior({
        id: 'b',
        starThresholds: [1, 10, 20],
        starPeriod: 'week',
        logs: [
          makeLog(weekStartTs),
          makeLog(weekStartTs + 86_400_000),
          makeLog(weekStartTs + 2 * 86_400_000),
          makeLog(ts),
          makeLog(ts - 3_600_000),
        ],
      }),
      // 2 logs in the current month, monthly period → 1 star ([1, 3, 5])
      makeBehavior({
        id: 'c',
        starThresholds: [1, 3, 5],
        starPeriod: 'month',
        logs: [makeLog(monthStartTs), makeLog(monthStartTs + 86_400_000)],
      }),
    ];
    // 1 (daily) + 1 (weekly) + 1 (monthly) = 3
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(3);
  });

  it('uses day as the default period when starPeriod is missing', () => {
    const ts = today.getTime();
    const yesterdayTs = ts - 86_400_000;
    const behaviors = [
      // No starPeriod → defaults to 'day' → only today counts, not yesterday.
      makeBehavior({
        id: 'a',
        starThresholds: [1, 3, 5],
        logs: [makeLog(yesterdayTs), makeLog(ts), makeLog(ts)],
      }),
    ];
    expect(getTotalStarsForDate(behaviors, todayStr)).toBe(1);
  });
});

describe('getStarPeriod', () => {
  it('returns starPeriod when set', () => {
    expect(getStarPeriod(makeBehavior({ starThresholds: [1, 3, 5], starPeriod: 'week' }))).toBe('week');
    expect(getStarPeriod(makeBehavior({ starThresholds: [1, 3, 5], starPeriod: 'month' }))).toBe('month');
  });

  it('defaults to day when missing (backward compat with v1 stored data)', () => {
    expect(getStarPeriod(makeBehavior({ starThresholds: [1, 3, 5] }))).toBe('day');
  });
});

describe('getPeriodRange', () => {
  // today = Sat June 20 2026
  const todayStr = '2026-06-20';

  it('day range is a single date', () => {
    expect(getPeriodRange('day', todayStr)).toEqual({ start: '2026-06-20', end: '2026-06-20' });
  });

  it('week range is Sunday–Saturday', () => {
    expect(getPeriodRange('week', todayStr)).toEqual({ start: '2026-06-14', end: '2026-06-20' });
  });

  it('week range snaps to containing week for non-Sat dates', () => {
    // June 17 (Wed) → Sun June 14 – Sat June 20
    expect(getPeriodRange('week', '2026-06-17')).toEqual({ start: '2026-06-14', end: '2026-06-20' });
  });

  it('week range snaps to containing week on Sunday itself', () => {
    // June 14 (Sun) → Sun June 14 – Sat June 20
    expect(getPeriodRange('week', '2026-06-14')).toEqual({ start: '2026-06-14', end: '2026-06-20' });
  });

  it('month range is the full calendar month', () => {
    expect(getPeriodRange('month', todayStr)).toEqual({ start: '2026-06-01', end: '2026-06-30' });
  });

  it('month range handles February (28 days) and 31-day months', () => {
    expect(getPeriodRange('month', '2026-02-15')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(getPeriodRange('month', '2026-12-01')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

describe('getLogsForPeriod', () => {
  // today = Sat June 20 2026 14:30
  const today = new Date(2026, 5, 20, 14, 30, 0);
  const todayStr = '2026-06-20';
  const ts = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

  beforeAll(() => {
    jest.useFakeTimers({ now: today });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('day period matches exactly that day', () => {
    const behavior = makeBehavior({
      logs: [makeLog(ts(2026, 6, 20, 8)), makeLog(ts(2026, 6, 21, 8))],
    });
    expect(getLogsForPeriod(behavior, 'day', todayStr).map(l => l.timestamp)).toEqual([ts(2026, 6, 20, 8)]);
  });

  it('week period spans Sun–Sat containing the anchor', () => {
    const behavior = makeBehavior({
      logs: [
        makeLog(ts(2026, 6, 13, 12)), // Sat, last week
        makeLog(ts(2026, 6, 14, 12)), // Sun, this week
        makeLog(ts(2026, 6, 20, 12)), // Sat, this week
        makeLog(ts(2026, 6, 21, 12)), // Sun, next week
      ],
    });
    expect(getLogsForPeriod(behavior, 'week', todayStr).map(l => l.timestamp)).toEqual([
      ts(2026, 6, 14, 12),
      ts(2026, 6, 20, 12),
    ]);
  });

  it('month period covers the entire calendar month', () => {
    const behavior = makeBehavior({
      logs: [
        makeLog(ts(2026, 5, 31, 12)), // May
        makeLog(ts(2026, 6, 1, 12)), // June
        makeLog(ts(2026, 6, 30, 12)), // June
        makeLog(ts(2026, 7, 1, 12)), // July
      ],
    });
    expect(getLogsForPeriod(behavior, 'month', todayStr).map(l => l.timestamp)).toEqual([
      ts(2026, 6, 1, 12),
      ts(2026, 6, 30, 12),
    ]);
  });
});
