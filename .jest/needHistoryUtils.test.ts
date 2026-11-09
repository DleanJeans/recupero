import {
  addLocalDays,
  countRefills,
  describeNeedEvent,
  formatAxisHour,
  formatLowTime,
  getAxisTicks,
  getChartStepMs,
  getEmptyHoursAt,
  getHistoryDayStarts,
  getNeedDayBands,
  getNeedRangeStats,
  getQuietWindows,
  getRateLearningPoints,
  MS_PER_DAY,
  replayNeedLevels,
} from '../src/utils/need-history-utils';
import type { NeedEvent } from '../src/utils/need-utils';

const H = 3_600_000;
const T0 = new Date(2026, 10, 7, 0, 0, 0).getTime();

describe('getEmptyHoursAt', () => {
  const history = [
    { ts: T0 + 10 * H, emptyHours: 6 },
    { ts: T0 + 20 * H, emptyHours: 7 },
  ];
  it('uses the default before any point and the latest point after', () => {
    expect(getEmptyHoursAt(history, 5, T0)).toBe(5);
    expect(getEmptyHoursAt(history, 5, T0 + 15 * H)).toBe(6);
    expect(getEmptyHoursAt(history, 5, T0 + 30 * H)).toBe(7);
  });
});

describe('replayNeedLevels', () => {
  const events: NeedEvent[] = [
    { ts: T0 + 2 * H, kind: 'set', level: 100, behaviorId: 'shower' },
    { ts: T0 + 6 * H, kind: 'add', amount: 30, behaviorId: 'water' },
  ];

  it('is empty with no events', () => {
    expect(replayNeedLevels([], () => 10, T0, T0 + 10 * H, H)).toEqual([]);
  });

  it('starts at the first event and jumps at each refill', () => {
    const points = replayNeedLevels(events, () => 10, T0, T0 + 8 * H, H);
    expect(points[0]).toEqual({ ts: T0 + 2 * H, level: 50 });
    expect(points[1]).toEqual({ ts: T0 + 2 * H, level: 100 });
    const atRefill = points.filter(point => point.ts === T0 + 6 * H);
    expect(atRefill.map(point => Math.round(point.level))).toEqual([60, 90, 90]);
    expect(points[points.length - 1]).toEqual({ ts: T0 + 8 * H, level: 70 });
  });

  it('decays each stretch at the rate that applied then', () => {
    const rateAt = (ts: number) => (ts < T0 + 4 * H ? 10 : 5);
    const points = replayNeedLevels([events[0]], rateAt, T0, T0 + 6 * H, H);
    // 2h at 10%/h, then 2h at 20%/h.
    expect(points[points.length - 1].level).toBeCloseTo(40);
  });

  it('replays events before the range without drawing them', () => {
    const points = replayNeedLevels(events, () => 10, T0 + 4 * H, T0 + 5 * H, H);
    expect(points).toEqual([
      { ts: T0 + 4 * H, level: 80 },
      { ts: T0 + 5 * H, level: 70 },
    ]);
  });
});

describe('stats and bands', () => {
  const points = [
    { ts: T0, level: 100 },
    { ts: T0 + 10 * H, level: 0 },
  ];
  it('averages over time and counts time below the line', () => {
    const stats = getNeedRangeStats(points, 30, T0, T0 + 10 * H);
    expect(stats.avg).toBeCloseTo(50);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(100);
    expect(stats.knownMs).toBe(10 * H);
  });
  it('splits into day bands', () => {
    const bands = getNeedDayBands(points, 30, [T0, T0 + 5 * H, T0 + 10 * H]);
    expect(bands).toHaveLength(2);
    expect(bands[0].avg).toBeCloseTo(75);
    expect(bands[1].avg).toBeCloseTo(25);
    expect(bands[1].lowMs).toBe(5 * H);
  });
  it('counts refills but not check-ins', () => {
    const events: NeedEvent[] = [
      { ts: T0 + H, kind: 'add', amount: 10, behaviorId: 'a' },
      { ts: T0 + 2 * H, kind: 'set', level: 40, checkIn: true },
      { ts: T0 + 30 * H, kind: 'add', amount: 10, behaviorId: 'a' },
    ];
    expect(countRefills(events, T0, T0 + MS_PER_DAY)).toBe(1);
  });
});

describe('helpers', () => {
  it('picks a coarser step for longer ranges', () => {
    expect(getChartStepMs(MS_PER_DAY)).toBeLessThan(getChartStepMs(30 * MS_PER_DAY));
  });
  it('lists learning points after the default', () => {
    expect(
      getRateLearningPoints(
        [
          { ts: 0, emptyHours: 5.5 },
          { ts: T0, emptyHours: 6 },
        ],
        5,
      ),
    ).toEqual([
      { index: 0, emptyHours: 5 },
      { index: 1, ts: undefined, emptyHours: 5.5 },
      { index: 2, ts: T0, emptyHours: 6 },
    ]);
  });
  it('builds day boundaries for a period, going back by offset', () => {
    const addDays = (ts: number, days: number) => ts + days * MS_PER_DAY;
    expect(getHistoryDayStarts(T0, 2, 0, addDays)).toEqual([T0 - MS_PER_DAY, T0, T0 + MS_PER_DAY]);
    expect(getHistoryDayStarts(T0, 2, 1, addDays)).toEqual([T0 - 3 * MS_PER_DAY, T0 - 2 * MS_PER_DAY, T0 - MS_PER_DAY]);
  });
});

describe('chart helpers', () => {
  it('finds quiet windows overlapping a range', () => {
    const windows = getQuietWindows(T0 + 12 * H, T0 + 36 * H);
    expect(windows).toEqual([{ from: T0 + 23 * H, to: T0 + 31 * H }]);
    expect(getQuietWindows(T0 + 3 * H, T0 + 5 * H)).toEqual([{ from: T0 + 3 * H, to: T0 + 5 * H }]);
  });
  it('labels hours for axes', () => {
    expect(formatAxisHour(T0 + 18 * H, true)).toBe('6p');
    expect(formatAxisHour(T0, true)).toBe('12a');
    expect(formatAxisHour(T0 + 6 * H, false)).toBe('06');
  });
  it('places ticks on local boundaries', () => {
    expect(getAxisTicks(T0 + H, T0 + 13 * H, 6 * H)).toEqual([T0 + 6 * H, T0 + 12 * H]);
  });
});

describe('describeNeedEvent', () => {
  it('labels refills and check-ins', () => {
    expect(describeNeedEvent({ ts: 0, kind: 'add', amount: 44.6, behaviorId: 'a' })).toBe('+45%');
    expect(describeNeedEvent({ ts: 0, kind: 'set', level: 100, behaviorId: 'a' })).toBe('Full');
    expect(describeNeedEvent({ ts: 0, kind: 'set', level: 25, checkIn: true })).toBe('Check-in 25%');
  });
  it('adds local days', () => {
    expect(addLocalDays(T0, 1)).toBe(new Date(2026, 10, 8).getTime());
  });
});

describe('formatLowTime', () => {
  it('formats time spent low', () => {
    expect(formatLowTime(0)).toBe('0m');
    expect(formatLowTime(40 * 60_000)).toBe('40m');
    expect(formatLowTime(170 * 60_000)).toBe('2h 50m');
    expect(formatLowTime(120 * 60_000)).toBe('2h');
  });
});
