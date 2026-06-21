import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import { decayEveryInDays, getDecayForGap, getDecayLogCount, getEffectiveLogCount } from '../src/utils/xpUtils';

const NOW_TS = new Date('2026-06-20T12:00:00').getTime();

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

function lastLog(daysAgo: number): number {
  const d = new Date(NOW_TS);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

/** Build a behavior with `n` logs ending `daysAgo` days before now, with optional XP decay enabled.
 *  The most recent log sits at `lastLog(daysAgo)`; older logs step back one day each. */
function behaviorWithLogs(daysAgo: number, n: number, decay?: BehaviorEntry['xpDecay']): BehaviorEntry {
  const ts = lastLog(daysAgo);
  return makeBehavior({
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

  describe('no decay within 1 calendar day', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('returns 0 when last log was today', () => {
      expect(getDecayLogCount(behaviorWithLogs(0, 5, decay), NOW_TS)).toBe(0);
    });

    it('returns 0 when last log was yesterday (1 day apart, 0 days strictly between)', () => {
      expect(getDecayLogCount(behaviorWithLogs(1, 5, decay), NOW_TS)).toBe(0);
    });
  });

  describe('every=1 day (matches original Wed-Fri=5XP, Wed-Sat=10XP)', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('2 days apart (Wed → Fri) → 1 log lost (5 XP)', () => {
      expect(getDecayLogCount(behaviorWithLogs(2, 5, decay), NOW_TS)).toBe(1);
    });

    it('3 days apart (Wed → Sat) → 2 logs lost (10 XP)', () => {
      expect(getDecayLogCount(behaviorWithLogs(3, 5, decay), NOW_TS)).toBe(2);
    });

    it('7 days apart (Wed → next Wed) → 6 logs lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(7, 20, decay), NOW_TS)).toBe(6);
    });
  });

  describe('every=3 days', () => {
    const decay = { every: 3, unit: 'days' as const };

    it('1 day apart → 0 lost', () => {
      expect(getDecayLogCount(behaviorWithLogs(1, 1, decay), NOW_TS)).toBe(0);
    });

    it('3 days apart → 0 lost (daysBetween=2, less than every=3)', () => {
      expect(getDecayLogCount(behaviorWithLogs(3, 1, decay), NOW_TS)).toBe(0);
    });

    it('4 days apart → 1 lost (daysBetween=3, ⌊3/3⌋=1, first tick)', () => {
      expect(getDecayLogCount(behaviorWithLogs(4, 1, decay), NOW_TS)).toBe(1);
    });

    it('7 days apart → 2 lost (daysBetween=6, ⌊6/3⌋=2)', () => {
      expect(getDecayLogCount(behaviorWithLogs(7, 1, decay), NOW_TS)).toBe(2);
    });

    it('10 days apart → 3 lost (daysBetween=9, ⌊9/3⌋=3)', () => {
      expect(getDecayLogCount(behaviorWithLogs(10, 1, decay), NOW_TS)).toBe(3);
    });
  });

  describe('every=1 week', () => {
    const decay = { every: 1, unit: 'weeks' as const };

    it('6 days apart → 0 lost (daysBetween=5, less than 7)', () => {
      expect(getDecayLogCount(behaviorWithLogs(6, 1, decay), NOW_TS)).toBe(0);
    });

    it('8 days apart → 1 lost (daysBetween=7, ⌊7/7⌋=1)', () => {
      expect(getDecayLogCount(behaviorWithLogs(8, 1, decay), NOW_TS)).toBe(1);
    });

    it('15 days apart → 2 lost (daysBetween=14, ⌊14/7⌋=2)', () => {
      expect(getDecayLogCount(behaviorWithLogs(15, 1, decay), NOW_TS)).toBe(2);
    });
  });

  describe('every=1 month (30 days)', () => {
    const decay = { every: 1, unit: 'months' as const };

    it('30 days apart → 0 lost (daysBetween=29, less than 30)', () => {
      expect(getDecayLogCount(behaviorWithLogs(30, 1, decay), NOW_TS)).toBe(0);
    });

    it('31 days apart → 1 lost (daysBetween=30, ⌊30/30⌋=1)', () => {
      expect(getDecayLogCount(behaviorWithLogs(31, 1, decay), NOW_TS)).toBe(1);
    });

    it('61 days apart → 2 lost (daysBetween=60, ⌊60/30⌋=2)', () => {
      expect(getDecayLogCount(behaviorWithLogs(61, 1, decay), NOW_TS)).toBe(2);
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
        // futureNow vs lastTimestamp = NOW_TS → calendarDiff=4, daysBetween=3 → 3 lost
        expect(getDecayLogCount(b)).toBe(3);
      } finally {
        realNow.mockRestore();
      }
    });
  });

  describe('sum across all gaps (lifetime decay)', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('sparse log at 5d ago + 10d ago: 4+4 = 8 days between gaps', () => {
      const ts5 = lastLog(5);
      const ts10 = lastLog(10);
      const b = makeBehavior({
        xpDecay: decay,
        lastTimestamp: ts5,
        logs: [makeLog(ts10), makeLog(ts5)],
      });
      // gap ts10→ts5: 5 cal days, 4 between → 4 decay
      // final gap ts5→now: 5 cal days, 4 between → 4 decay
      // total = 4 + 4 = 8 (NOT 4, which is what the old single-gap logic would give)
      expect(getDecayLogCount(b, NOW_TS)).toBe(8);
    });

    it('three logs spread 5d apart each: 4+4+0 = 8 days between', () => {
      const ts0 = lastLog(0);
      const ts5 = lastLog(5);
      const ts10 = lastLog(10);
      const b = makeBehavior({
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: [makeLog(ts10), makeLog(ts5), makeLog(ts0)],
      });
      // gap ts10→ts5: 4 between → 4
      // gap ts5→ts0: 4 between → 4
      // final gap ts0→now: 0 between → 0
      // total = 8
      expect(getDecayLogCount(b, NOW_TS)).toBe(8);
    });

    it('long history: 100 logs over 100 days → no decay (consecutive days)', () => {
      const ts0 = lastLog(0);
      // 100 logs, one per day, oldest 99d ago
      const logList: LogEntry[] = Array.from({ length: 100 }, (_, i) => makeLog(lastLog(i)));
      const b = makeBehavior({
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: logList,
      });
      // All inter-log gaps = 0 between (consecutive days).
      // Final gap ts0→now: 0 between (same day).
      // total = 0
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('long history with one big gap in the middle: decay includes that gap', () => {
      const ts0 = lastLog(0);
      const ts1 = lastLog(1);
      const ts50 = lastLog(50);
      const b = makeBehavior({
        xpDecay: decay,
        lastTimestamp: ts0,
        logs: [makeLog(ts50), makeLog(ts1), makeLog(ts0)],
      });
      // gap ts50→ts1: 49 cal, 48 between → 48
      // gap ts1→ts0: 0 between → 0
      // final gap ts0→now: 0 between → 0
      // total = 48
      expect(getDecayLogCount(b, NOW_TS)).toBe(48);
    });
  });
});

describe('getEffectiveLogCount', () => {
  it('returns raw log count when feature is off', () => {
    expect(getEffectiveLogCount(behaviorWithLogs(0, 10), NOW_TS)).toBe(10);
  });

  it('subtracts decay from raw log count', () => {
    // 3 days apart, daysBetween=2, decay=2 → 10-2=8
    expect(getEffectiveLogCount(behaviorWithLogs(3, 10, { every: 1, unit: 'days' }), NOW_TS)).toBe(8);
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

  it('treats later < earlier as no decay (defensive against clock skew)', () => {
    expect(getDecayForGap(NOW_TS, lastLog(5), decay)).toBe(0);
  });
});
