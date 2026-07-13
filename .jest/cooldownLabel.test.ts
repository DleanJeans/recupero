import type { BehaviorEntry } from '../src/types/behavior';
import { COLORS, type CooldownType, getCooldownColor } from '../src/utils/cooldown-utils';

const NOW = 1_000_000_000_000;

function getColor(cooldownMinutes: number, lastTimestamp: number | null, cooldownType: CooldownType = 'rest') {
  const behavior: BehaviorEntry = {
    id: 'behavior-1',
    name: 'Test behavior',
    type: 'neutral',
    lastTimestamp,
    metadata: {},
    logs: [],
    cooldownMinutes,
    cooldownEnabled: true,
    cooldownType,
  };
  return getCooldownColor(behavior);
}

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('getCooldownColor', () => {
  describe('no lastTimestamp', () => {
    it('returns MUTED for null', () => {
      expect(getColor(30, null)).toBe(COLORS.MUTED);
    });
  });

  describe('still in cooldown', () => {
    it('returns GREEN when elapsed < cooldown', () => {
      expect(getColor(30, NOW - 10 * 60_000)).toBe(COLORS.GREEN);
    });

    it('returns GREEN when elapsed is 0 (just logged)', () => {
      expect(getColor(30, NOW)).toBe(COLORS.GREEN);
    });

    it('returns GREEN at the boundary (1ms before cooldown ends)', () => {
      expect(getColor(30, NOW - 29 * 60_000 + 1)).toBe(COLORS.GREEN);
    });
  });

  describe('past cooldown, within 1 order of magnitude (yellow)', () => {
    it('returns YELLOW when elapsed just past cooldown (minutes)', () => {
      expect(getColor(30, NOW - 31 * 60_000)).toBe(COLORS.YELLOW);
    });

    it('returns YELLOW when elapsed past cooldown (hours)', () => {
      expect(getColor(60, NOW - 3 * 3600_000)).toBe(COLORS.YELLOW);
    });

    it('returns YELLOW when elapsed past cooldown (days)', () => {
      expect(getColor(2 * 24 * 60, NOW - 3 * 24 * 3600_000)).toBe(COLORS.YELLOW);
    });
  });

  describe('past 1 order of magnitude (red)', () => {
    describe('cooldown in minutes (< 24h)', () => {
      it('returns RED when elapsed >= 1 day', () => {
        expect(getColor(30, NOW - 25 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns RED at exactly 1 day boundary', () => {
        expect(getColor(30, NOW - 24 * 3600_000)).toBe(COLORS.RED);
      });
    });

    describe('cooldown in hours (< 24h)', () => {
      it('returns RED when elapsed >= 1 day', () => {
        expect(getColor(120, NOW - 30 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns YELLOW when elapsed < 1 day', () => {
        expect(getColor(120, NOW - 10 * 3600_000)).toBe(COLORS.YELLOW);
      });
    });

    describe('cooldown in days (>= 24h)', () => {
      it('returns RED when elapsed >= 1 week', () => {
        expect(getColor(3 * 24 * 60, NOW - 10 * 24 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns RED at exactly 1 week boundary', () => {
        expect(getColor(3 * 24 * 60, NOW - 7 * 24 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns YELLOW when elapsed < 1 week', () => {
        expect(getColor(3 * 24 * 60, NOW - 5 * 24 * 3600_000)).toBe(COLORS.YELLOW);
      });
    });
  });

  describe('cooldownType = limit (inverted colors)', () => {
    it('returns RED when within cooldown (opposite of rest)', () => {
      expect(getColor(30, NOW - 10 * 60_000, 'limit')).toBe(COLORS.RED);
    });

    it('returns YELLOW when past cooldown but within threshold', () => {
      expect(getColor(30, NOW - 31 * 60_000, 'limit')).toBe(COLORS.YELLOW);
    });

    it('returns GREEN when past 1 order of magnitude (opposite of rest)', () => {
      expect(getColor(30, NOW - 25 * 3600_000, 'limit')).toBe(COLORS.GREEN);
    });

    it('returns GREEN at exactly 1 day boundary (limit)', () => {
      expect(getColor(30, NOW - 24 * 3600_000, 'limit')).toBe(COLORS.GREEN);
    });
  });
});
