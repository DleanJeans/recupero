import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import { decayEveryInDays, getDecayLogCount, getEffectiveLogCount } from '../src/utils/xpUtils';

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

function logs(n: number, daysAgo: number): LogEntry[] {
  return Array.from({ length: n }, (_, i) => makeLog(lastLog(daysAgo) - i));
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
      const b = makeBehavior({ lastTimestamp: lastLog(5), logs: logs(10, 5) });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('returns 0 when lastTimestamp is null', () => {
      const b = makeBehavior({ xpDecay: { every: 1, unit: 'days' }, lastTimestamp: null, logs: [] });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });
  });

  describe('no decay within 1 calendar day', () => {
    it('returns 0 when last log was today', () => {
      const b = makeBehavior({
        xpDecay: { every: 1, unit: 'days' },
        lastTimestamp: lastLog(0),
        logs: logs(5, 0),
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('returns 0 when last log was yesterday (1 day apart, 0 days strictly between)', () => {
      const b = makeBehavior({
        xpDecay: { every: 1, unit: 'days' },
        lastTimestamp: lastLog(1),
        logs: logs(5, 1),
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });
  });

  describe('every=1 day (matches original Wed-Fri=5XP, Wed-Sat=10XP)', () => {
    const decay = { every: 1, unit: 'days' as const };

    it('2 days apart (Wed → Fri) → 1 log lost (5 XP)', () => {
      const b = makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(2), logs: logs(5, 2) });
      expect(getDecayLogCount(b, NOW_TS)).toBe(1);
    });

    it('3 days apart (Wed → Sat) → 2 logs lost (10 XP)', () => {
      const b = makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(3), logs: logs(5, 3) });
      expect(getDecayLogCount(b, NOW_TS)).toBe(2);
    });

    it('7 days apart (Wed → next Wed) → 6 logs lost', () => {
      const b = makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(7), logs: logs(20, 7) });
      expect(getDecayLogCount(b, NOW_TS)).toBe(6);
    });
  });

  describe('every=3 days', () => {
    const decay = { every: 3, unit: 'days' as const };

    it('1 day apart → 0 lost', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(1) }), NOW_TS)).toBe(0);
    });

    it('3 days apart → 0 lost (daysBetween=2, less than every=3)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(3) }), NOW_TS)).toBe(0);
    });

    it('4 days apart → 1 lost (daysBetween=3, ⌊3/3⌋=1, first tick)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(4) }), NOW_TS)).toBe(1);
    });

    it('7 days apart → 2 lost (daysBetween=6, ⌊6/3⌋=2)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(7) }), NOW_TS)).toBe(2);
    });

    it('10 days apart → 3 lost (daysBetween=9, ⌊9/3⌋=3)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(10) }), NOW_TS)).toBe(3);
    });
  });

  describe('every=1 week', () => {
    const decay = { every: 1, unit: 'weeks' as const };

    it('6 days apart → 0 lost (daysBetween=5, less than 7)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(6) }), NOW_TS)).toBe(0);
    });

    it('8 days apart → 1 lost (daysBetween=7, ⌊7/7⌋=1)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(8) }), NOW_TS)).toBe(1);
    });

    it('15 days apart → 2 lost (daysBetween=14, ⌊14/7⌋=2)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(15) }), NOW_TS)).toBe(2);
    });
  });

  describe('every=1 month (30 days)', () => {
    const decay = { every: 1, unit: 'months' as const };

    it('30 days apart → 0 lost (daysBetween=29, less than 30)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(30) }), NOW_TS)).toBe(0);
    });

    it('31 days apart → 1 lost (daysBetween=30, ⌊30/30⌋=1)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(31) }), NOW_TS)).toBe(1);
    });

    it('61 days apart → 2 lost (daysBetween=60, ⌊60/30⌋=2)', () => {
      expect(getDecayLogCount(makeBehavior({ xpDecay: decay, lastTimestamp: lastLog(61) }), NOW_TS)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('every=0 → 0 lost (avoids divide-by-zero)', () => {
      const b = makeBehavior({
        xpDecay: { every: 0, unit: 'days' },
        lastTimestamp: lastLog(10),
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('NaN every → 0 lost', () => {
      const b = makeBehavior({
        xpDecay: { every: Number.NaN, unit: 'days' },
        lastTimestamp: lastLog(10),
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('future lastTimestamp → 0 lost (no negative decay)', () => {
      const b = makeBehavior({
        xpDecay: { every: 1, unit: 'days' },
        lastTimestamp: NOW_TS + 5 * 86400000,
      });
      expect(getDecayLogCount(b, NOW_TS)).toBe(0);
    });

    it('uses Date.now() when `now` is omitted', () => {
      const futureNow = NOW_TS + 4 * 86400000; // 4 days from NOW_TS
      const realNow = jest.spyOn(Date, 'now').mockReturnValue(futureNow);
      try {
        const b = makeBehavior({ xpDecay: { every: 1, unit: 'days' }, lastTimestamp: lastLog(0) });
        // NOW_TS + 4 days vs lastTimestamp = NOW_TS → calendarDiff=4, daysBetween=3 → 3 lost
        expect(getDecayLogCount(b)).toBe(3);
      } finally {
        realNow.mockRestore();
      }
    });
  });
});

describe('getEffectiveLogCount', () => {
  it('returns raw log count when feature is off', () => {
    const b = makeBehavior({ logs: logs(10, 0), lastTimestamp: lastLog(0) });
    expect(getEffectiveLogCount(b, NOW_TS)).toBe(10);
  });

  it('subtracts decay from raw log count', () => {
    const b = makeBehavior({
      xpDecay: { every: 1, unit: 'days' },
      logs: logs(10, 3),
      lastTimestamp: lastLog(3),
    });
    // 3 days apart, daysBetween=2, decay=2 → 10-2=8
    expect(getEffectiveLogCount(b, NOW_TS)).toBe(8);
  });

  it('floors at 0 when decay exceeds logs', () => {
    const b = makeBehavior({
      xpDecay: { every: 1, unit: 'days' },
      logs: logs(3, 10),
      lastTimestamp: lastLog(10),
    });
    // 10 days apart, daysBetween=9, decay=9 → max(0, 3-9) = 0
    expect(getEffectiveLogCount(b, NOW_TS)).toBe(0);
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
