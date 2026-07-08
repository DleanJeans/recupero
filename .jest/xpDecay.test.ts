import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import {
  decayEveryInDays,
  getBehaviorXp,
  getDecayedLogs,
  getDecayForGap,
  getDecayLogCount,
  getEffectiveLogCount,
  getEffectiveXp,
  getHighestEffectiveXp,
  getTimeUntilNextDecay,
} from '../src/utils/xp-utils';

const NOW_TS = new Date('2026-06-20T12:00:00').getTime();
const PMO_LOG_TIMESTAMPS = [
  1781001000000, 1781199000000, 1781260200000, 1781344200000, 1781426700000, 1781865840000, 1782037800000,
  1782290880000, 1782430800000, 1782480480000, 1782583800000, 1782612420000, 1782718140000, 1782842100000,
  1782978360000, 1783408380000, 1783476600000,
];

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

function makeTimedLog(startTimestamp: number, minutes: number): LogEntry {
  return {
    id: `timed-${startTimestamp}-${minutes}`,
    timestamp: startTimestamp,
    endTimestamp: startTimestamp + minutes * 60_000,
  };
}

function lastLog(daysAgo: number): number {
  const d = new Date(NOW_TS);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

function hoursAgo(hours: number): number {
  return NOW_TS - hours * 60 * 60 * 1000;
}

/** Build a behavior with `n` logs ending `daysAgo` days before now, with optional XP decay enabled.
 *  Passing a `decay` config opts the behavior in to XP calculation too (decay is a sub-feature). */
function behaviorWithLogs(daysAgo: number, n: number, decay?: BehaviorEntry['xpDecay']): BehaviorEntry {
  const ts = lastLog(daysAgo);
  return makeBehavior({
    xpEnabled: decay ? true : undefined,
    xpDecay: decay,
    lastTimestamp: ts,
    logs: Array.from({ length: n }, (_, i) => makeLog(ts - i)),
  });
}

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW_TS);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('decayEveryInDays', () => {
  it('converts hours to fractional days', () => {
    expect(decayEveryInDays(12, 'hours')).toBe(0.5);
    expect(decayEveryInDays(6, 'hours')).toBe(0.25);
  });

  it('returns the value unchanged for days', () => {
    expect(decayEveryInDays(1, 'days')).toBe(1);
    expect(decayEveryInDays(7, 'days')).toBe(7);
  });

  it('multiplies by 7 for weeks', () => {
    expect(decayEveryInDays(1, 'weeks')).toBe(7);
    expect(decayEveryInDays(2, 'weeks')).toBe(14);
  });

  it('multiplies by 30 for months (30-day approximation)', () => {
    expect(decayEveryInDays(1, 'months')).toBe(30);
    expect(decayEveryInDays(3, 'months')).toBe(90);
  });
});

describe('getDecayLogCount', () => {
  describe('feature off', () => {
    it('returns 0 when xpDecay is undefined', () => {
      const b = behaviorWithLogs(5, 10);
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('returns 0 when lastTimestamp is null', () => {
      const b = makeBehavior({ xpDecay: { every: 1, unit: 'days' }, lastTimestamp: null, logs: [] });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });
  });

  describe('no decay within the same operational day', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('returns 0 when last log was today', () => {
      expect(getDecayLogCount(behaviorWithLogs(0, 5, decay), NOW_TS)).toBe(0);
    });
  });

  describe('every=1 day', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('1 day apart → 1 log lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(1, 5, decay), NOW_TS)).toBe(1);
    });

    it('3 days apart → 3 logs lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(3, 5, decay), NOW_TS)).toBe(3);
    });

    it('7 days apart → 7 logs lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(7, 20, decay), NOW_TS)).toBe(7);
    });
  });

  describe('every=3 days', () => {
    const decay = { every: 3, unit: 'days' as const };

    it('1 day apart → 0 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(1, 1, decay), NOW_TS)).toBe(0);
    });

    it('2 days apart → 0 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(2, 1, decay), NOW_TS)).toBe(0);
    });

    it('3 days apart → 1 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(3, 1, decay), NOW_TS)).toBe(1);
    });

    it('7 days apart → 1 lost (final gap has 2 cycles but only one log exists)', () => {
      expect(getDecayLogCount(behaviorWithLogs(7, 1, decay), NOW_TS)).toBe(1);
    });

    it('10 days apart → 1 lost (final gap has 3 cycles but only one log exists)', () => {
      expect(getDecayLogCount(behaviorWithLogs(10, 1, decay), NOW_TS)).toBe(1);
    });
  });

  describe('every=3 days effective XP', () => {
    const decay = { every: 3, unit: 'days' as const };

    it('subtracts decayed legacy-log XP after one 3-day period', () => {
      const b = behaviorWithLogs(3, 5, decay);

      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
      expect(getEffectiveXp(b, NOW_TS)).toBe(20);
    });

    it('subtracts the whole XP of the oldest timed log after one 3-day period', () => {
      const oldest = lastLog(4);
      const latest = lastLog(3);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: latest + 5 * 60_000,
        logs: [makeTimedLog(oldest, 30), makeTimedLog(latest, 5)],
      });

      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
      expect(getDecayedLogs(b, NOW_TS).map(log => log.id)).toEqual([`timed-${oldest}-30`]);
      expect(getEffectiveXp(b, NOW_TS)).toBe(5);
    });

    it('decays two PMO fixture logs when checked on the latest log day', () => {
      const latestLogTimestamp = PMO_LOG_TIMESTAMPS.at(-1)!;
      const b = makeBehavior({
        name: 'PMO',
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: latestLogTimestamp,
        logs: PMO_LOG_TIMESTAMPS.map(makeLog),
      });

      expect(getDecayLogCount(b, latestLogTimestamp)).toBe(2);
      expect(getDecayedLogs(b, latestLogTimestamp).map(log => log.timestamp)).toEqual(PMO_LOG_TIMESTAMPS.slice(0, 2));
      expect(getEffectiveXp(b, latestLogTimestamp)).toBe(75);
      expect(getHighestEffectiveXp(b, latestLogTimestamp)).toBe(75);
    });

    it('decays another PMO fixture log three operational days after the latest log', () => {
      const latestLogTimestamp = PMO_LOG_TIMESTAMPS.at(-1)!;
      const now = latestLogTimestamp + 3 * 86_400_000;
      const b = makeBehavior({
        name: 'PMO',
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: latestLogTimestamp,
        logs: PMO_LOG_TIMESTAMPS.map(makeLog),
      });

      expect(getDecayLogCount(b, now)).toBe(3);
      expect(getDecayedLogs(b, now).map(log => log.timestamp)).toEqual(PMO_LOG_TIMESTAMPS.slice(0, 3));
      expect(getEffectiveXp(b, now)).toBe(70);
      expect(getHighestEffectiveXp(b, now)).toBe(75);
    });
  });

  describe('every=1 week', () => {
    const decay = { every: 1, unit: 'weeks' as const };

    it('6 days apart → 0 lost (less than 7)', () => {
      expect(getDecayLogCount(behaviorWithLogs(6, 1, decay), NOW_TS)).toBe(0);
    });

    it('7 days apart → 1 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(7, 1, decay), NOW_TS)).toBe(1);
    });

    it('15 days apart → 1 lost (final gap has 2 cycles but only one log exists)', () => {
      expect(getDecayLogCount(behaviorWithLogs(15, 1, decay), NOW_TS)).toBe(1);
    });
  });

  describe('every=1 month (30 days)', () => {
    const decay = { every: 1, unit: 'months' as const };

    it('29 days apart → 0 lost (less than 30)', () => {
      expect(getDecayLogCount(behaviorWithLogs(29, 1, decay), NOW_TS)).toBe(0);
    });

    it('30 days apart → 1 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(30, 1, decay), NOW_TS)).toBe(1);
    });

    it('61 days apart → 1 lost (final gap has 2 cycles but only one log exists)', () => {
      expect(getDecayLogCount(behaviorWithLogs(61, 1, decay), NOW_TS)).toBe(1);
    });
  });
  describe('every=12 hours', () => {
    const decay = { every: 12, unit: 'hours' as const };

    it('returns 0 before a full hourly cycle elapses', () => {
      const ts = hoursAgo(11);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts,
        logs: [makeLog(ts)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('loses 1 log after a full 12-hour cycle', () => {
      const ts = hoursAgo(12);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts,
        logs: [makeLog(ts)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
    });

    it('counts multiple elapsed hourly cycles when enough logs exist', () => {
      const ts = hoursAgo(25);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts,
        logs: Array.from({ length: 5 }, (_, i) => makeLog(ts - i)),
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    });

    it('protects the latest hourly streak from accumulated gap decay', () => {
      const ts30 = hoursAgo(30);
      const ts1 = hoursAgo(1);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts1,
        logs: [makeLog(ts30), makeLog(ts1)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('every=0 → 0 lost (avoids divide-by-zero)', () => {
      const b = behaviorWithLogs(10, 1, { every: 0, unit: 'days' });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('NaN every → 0 lost', () => {
      const b = behaviorWithLogs(10, 1, { every: Number.NaN, unit: 'days' });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('future lastTimestamp → 0 lost (no negative decay)', () => {
      const futureTs = NOW_TS + 5 * 86400000;
      const b = makeBehavior({
        xpDecay: { every: 1, unit: 'days' },
        lastTimestamp: futureTs,
        logs: [makeLog(futureTs)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('uses Date.now() when `now` is omitted', () => {
      const futureNow = NOW_TS + 4 * 86400000; // 4 days from NOW_TS
      const realNow = jest.spyOn(Date, 'now').mockReturnValue(futureNow);
      try {
        const b = behaviorWithLogs(0, 1, { every: 1, unit: 'days' });
        // 1 log at NOW_TS, now=NOW_TS+4d → final gap has 4 elapsed days.
        // Decay is capped to the one existing log.
        expect(getDecayLogCount(b)).toBe(1);
      } finally {
        realNow.mockRestore();
      }
    });
  });

  describe('cumulative gap decay', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('consecutive logs survive forever: 100 logs, one per day → 0 cancelled', () => {
      const ts0 = lastLog(0);
      const logList: LogEntry[] = Array.from({ length: 100 }, (_, i) => makeLog(lastLog(i)));
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: logList,
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('caps accumulated decay at the log count', () => {
      const ts5 = lastLog(5);
      const ts10 = lastLog(10);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts5,
        logs: [makeLog(ts10), makeLog(ts5)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    });

    it('accumulates decay across historical gaps before the latest streak', () => {
      const ts0 = lastLog(0);
      const ts5 = lastLog(5);
      const ts10 = lastLog(10);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: [makeLog(ts10), makeLog(ts5), makeLog(ts0)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    });

    it('large mid-history gaps still protect the latest streak', () => {
      const ts0 = lastLog(0);
      const ts1 = lastLog(1);
      const ts50 = lastLog(50);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: [makeLog(ts50), makeLog(ts1), makeLog(ts0)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
    });

    it('small gaps do not decay, but a later large gap still accumulates', () => {
      const ts0 = lastLog(0);
      const ts1 = lastLog(1);
      const ts2 = lastLog(2);
      const ts50 = lastLog(50);
      const ts51 = lastLog(51);
      const b = makeBehavior({
        xpEnabled: true,
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: [makeLog(ts51), makeLog(ts50), makeLog(ts2), makeLog(ts1), makeLog(ts0)],
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    });
  });
});

describe('getDecayLogCount with XP off (xpEnabled=undefined)', () => {
  it('returns 0 even when xpDecay is set (decay is gated on XP)', () => {
    const b = makeBehavior({
      xpDecay: { every: 1, unit: 'days' },
      lastTimestamp: lastLog(10),
    });
    expect(getDecayLogCount(b, NOW_TS)).toBe(0);
  });

  it('getEffectiveLogCount returns raw log count when XP is off', () => {
    const b = makeBehavior({
      xpDecay: { every: 1, unit: 'days' },
      lastTimestamp: lastLog(0),
    });
    expect(getEffectiveLogCount(b, NOW_TS)).toBe(0);
  });
});

describe('getEffectiveLogCount', () => {
  it('returns raw log count when feature is off', () => {
    expect(getEffectiveLogCount(behaviorWithLogs(0, 10), NOW_TS)).toBe(10);
  });

  it('subtracts decay from raw log count', () => {
    expect(getEffectiveLogCount(behaviorWithLogs(3, 10, { every: 1, unit: 'days' }), NOW_TS)).toBe(7);
  });

  it('floors at 0 when decay exceeds logs', () => {
    // 10 days apart, daysBetween=9, decay=9 → max(0, 3-9) = 0
    expect(getEffectiveLogCount(behaviorWithLogs(10, 3, { every: 1, unit: 'days' }), NOW_TS)).toBe(0);
  });

  it('returns 0 for behavior with no logs', () => {
    const b = makeBehavior({
      xpDecay: { every: 1, unit: 'days' },
      logs: [],
      lastTimestamp: null,
    });
    expect(getEffectiveLogCount(b, NOW_TS)).toBe(0);
  });
});

describe('duration-based XP', () => {
  it('uses 5 XP for legacy logs without an end timestamp', () => {
    const b = makeBehavior({
      logs: [makeLog(NOW_TS), makeLog(NOW_TS - 60_000)],
    });
    expect(getBehaviorXp(b)).toBe(10);
  });

  it('uses 1 XP per minute for timed logs', () => {
    const b = makeBehavior({
      logs: [makeTimedLog(NOW_TS - 40 * 60_000, 25)],
    });
    expect(getBehaviorXp(b)).toBe(25);
  });

  it('subtracts the whole XP of a decayed timed log', () => {
    const start = lastLog(3);
    const b = makeBehavior({
      xpEnabled: true,
      xpDecay: { every: 1, unit: 'days' },
      lastTimestamp: start + 30 * 60_000,
      logs: [makeTimedLog(start, 30)],
    });

    expect(getBehaviorXp(b)).toBe(30);
    expect(getDecayLogCount(b, NOW_TS)).toBe(1);
    expect(getDecayedLogs(b, NOW_TS).map(log => log.id)).toEqual([`timed-${start}-30`]);
    expect(getEffectiveXp(b, NOW_TS)).toBe(0);
  });

  it('decays oldest timed logs first', () => {
    const oldest = lastLog(4);
    const middle = lastLog(3);
    const newest = lastLog(0);
    const b = makeBehavior({
      xpEnabled: true,
      xpDecay: { every: 1, unit: 'days' },
      lastTimestamp: newest + 5 * 60_000,
      logs: [makeTimedLog(newest, 5), makeTimedLog(oldest, 30), makeTimedLog(middle, 10)],
    });

    expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    expect(getDecayedLogs(b, NOW_TS).map(log => log.id)).toEqual([`timed-${oldest}-30`, `timed-${middle}-10`]);
    expect(getEffectiveXp(b, NOW_TS)).toBe(5);
  });
});

describe('getHighestEffectiveXp', () => {
  it('keeps the highest era XP without decayed final XP', () => {
    const decay = { every: 3, unit: 'days' as const };
    const b = makeBehavior({
      xpEnabled: true,
      xpDecay: decay,
      lastTimestamp: lastLog(2) + 5 * 60_000,
      logs: [makeTimedLog(lastLog(10), 30), makeTimedLog(lastLog(9), 10), makeTimedLog(lastLog(2), 5)],
    });

    expect(getEffectiveXp(b, NOW_TS)).toBe(5);
    expect(getHighestEffectiveXp(b, NOW_TS)).toBe(40);
  });
});

describe('getDecayForGap', () => {
  const decay = { every: 1, unit: 'days' as const };

  it('returns 0 when decay is undefined', () => {
    expect(getDecayForGap(lastLog(5), NOW_TS, undefined)).toBe(0);
  });

  it('returns 0 for a 1-day gap (no days strictly between)', () => {
    expect(getDecayForGap(lastLog(1), NOW_TS, decay)).toBe(0);
  });

  it('returns 1 for a 2-day gap (Wed → Fri)', () => {
    expect(getDecayForGap(lastLog(2), NOW_TS, decay)).toBe(1);
  });

  it('returns 2 for a 3-day gap (Wed → Sat)', () => {
    expect(getDecayForGap(lastLog(3), NOW_TS, decay)).toBe(2);
  });

  it('returns 6 for a 7-day gap', () => {
    expect(getDecayForGap(lastLog(7), NOW_TS, decay)).toBe(6);
  });

  it('returns 0 for every=0 (avoids divide-by-zero)', () => {
    expect(getDecayForGap(lastLog(10), NOW_TS, { every: 0, unit: 'days' })).toBe(0);
  });

  it('honors every=3 days: 4-day gap → 1 lost, 7-day gap → 2 lost', () => {
    const d3 = { every: 3, unit: 'days' as const };
    expect(getDecayForGap(lastLog(4), NOW_TS, d3)).toBe(1);
    expect(getDecayForGap(lastLog(7), NOW_TS, d3)).toBe(2);
  });

  it('honors hourly decay: 11h gap → 0 lost, 12h gap → 1 lost, 25h gap → 2 lost', () => {
    const h12 = { every: 12, unit: 'hours' as const };
    expect(getDecayForGap(hoursAgo(11), NOW_TS, h12)).toBe(0);
    expect(getDecayForGap(hoursAgo(12), NOW_TS, h12)).toBe(1);
    expect(getDecayForGap(hoursAgo(25), NOW_TS, h12)).toBe(2);
  });

  it('treats later < earlier as no decay (defensive against clock skew)', () => {
    expect(getDecayForGap(NOW_TS, lastLog(5), decay)).toBe(0);
  });
});

describe('getTimeUntilNextDecay', () => {
  const decay = { every: 1, unit: 'days' as const };

  it('returns null when XP is disabled', () => {
    const b = makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(0) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toBeNull();
  });

  it('returns null when no xpDecay config', () => {
    const b = makeBehavior({ xpEnabled: true, lastTimestamp: lastLog(0) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toBeNull();
  });

  it('returns a full cycle when lastTimestamp is null (no logs yet)', () => {
    const b = makeBehavior({ xpEnabled: true, xpDecay: decay, lastTimestamp: null });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toEqual({ daysLeft: 1, everyDays: 1, every: 1, unit: 'days' });
  });

  it('returns full cycle when last log was today', () => {
    const b = makeBehavior({ xpEnabled: true, xpDecay: decay, lastTimestamp: lastLog(0) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toEqual({ daysLeft: 1, everyDays: 1, every: 1, unit: 'days' });
  });

  it('returns full cycle 1 day after last log (cycle just completed, next cycle full)', () => {
    // Fractional: 1 day elapsed, 1%1=0, daysLeft=1
    const b = makeBehavior({ xpEnabled: true, xpDecay: decay, lastTimestamp: lastLog(1) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toEqual({ daysLeft: 1, everyDays: 1, every: 1, unit: 'days' });
  });

  it('returns 33% time left after 16h with every=1 day (fractional time)', () => {
    const sixteenHoursAgo = NOW_TS - 16 * 3600 * 1000;
    const b = makeBehavior({ xpEnabled: true, xpDecay: decay, lastTimestamp: sixteenHoursAgo });
    // 16/24 ≈ 0.667 elapsed, 0.667%1=0.667, daysLeft=1-0.667=0.333
    const result = getTimeUntilNextDecay(b, NOW_TS);
    expect(result?.daysLeft).toBeCloseTo(0.333, 2);
    expect(result?.everyDays).toBe(1);
  });

  it('returns partial cycle for weekly decay: 3 days in = 4 left', () => {
    const weekly = { every: 1, unit: 'weeks' as const };
    const b = makeBehavior({ xpEnabled: true, xpDecay: weekly, lastTimestamp: lastLog(3) });
    // 3 days elapsed (fractional), 3%7=3, daysLeft=4
    expect(getTimeUntilNextDecay(b, NOW_TS)).toEqual({ daysLeft: 4, everyDays: 7, every: 1, unit: 'weeks' });
  });

  it('returns partial cycle for 12-hour decay: 5 hours in = 7 hours left', () => {
    const h12 = { every: 12, unit: 'hours' as const };
    const b = makeBehavior({ xpEnabled: true, xpDecay: h12, lastTimestamp: hoursAgo(5) });
    const result = getTimeUntilNextDecay(b, NOW_TS);
    expect(result?.daysLeft).toBeCloseTo(7 / 24, 5);
    expect(result?.everyDays).toBe(0.5);
    expect(result?.every).toBe(12);
    expect(result?.unit).toBe('hours');
  });

  it('returns full cycle when last log is on the same day boundary', () => {
    // 7 days elapsed, 7%7=0, daysLeft=7 (next cycle just started)
    const b = makeBehavior({ xpEnabled: true, xpDecay: { every: 7, unit: 'days' }, lastTimestamp: lastLog(7) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toEqual({ daysLeft: 7, everyDays: 7, every: 7, unit: 'days' });
  });

  it('returns null for invalid everyDays (every=0)', () => {
    const b = makeBehavior({ xpEnabled: true, xpDecay: { every: 0, unit: 'days' }, lastTimestamp: lastLog(0) });
    expect(getTimeUntilNextDecay(b, NOW_TS)).toBeNull();
  });
});
