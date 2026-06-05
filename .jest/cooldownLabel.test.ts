import { COLORS, getCooldownColor } from '../src/utils/cooldownUtils';

const NOW = 1_000_000_000_000;

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('getCooldownColor', () => {
  describe('no lastTimestamp', () => {
    it('returns MUTED for undefined', () => {
      expect(getCooldownColor(30, undefined)).toBe(COLORS.MUTED);
    });

    it('returns MUTED for null', () => {
      expect(getCooldownColor(30, null)).toBe(COLORS.MUTED);
    });
  });

  describe('still in cooldown', () => {
    it('returns GREEN when elapsed < cooldown', () => {
      // 10 min ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 10 * 60_000)).toBe(COLORS.GREEN);
    });

    it('returns GREEN when elapsed is 0 (just logged)', () => {
      expect(getCooldownColor(30, NOW)).toBe(COLORS.GREEN);
    });

    it('returns GREEN at the boundary (1ms before cooldown ends)', () => {
      expect(getCooldownColor(30, NOW - 29 * 60_000 + 1)).toBe(COLORS.GREEN);
    });
  });

  describe('past cooldown, within 1 order of magnitude (yellow)', () => {
    it('returns YELLOW when elapsed just past cooldown (minutes)', () => {
      // 31 min ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 31 * 60_000)).toBe(COLORS.YELLOW);
    });

    it('returns YELLOW when elapsed past cooldown (hours)', () => {
      // 3h ago, cooldown 1h
      expect(getCooldownColor(60, NOW - 3 * 3600_000)).toBe(COLORS.YELLOW);
    });

    it('returns YELLOW when elapsed past cooldown (days)', () => {
      // 3 days ago, cooldown 2 days
      expect(getCooldownColor(2 * 24 * 60, NOW - 3 * 24 * 3600_000)).toBe(COLORS.YELLOW);
    });
  });

  describe('past 1 order of magnitude (red)', () => {
    describe('cooldown in minutes (< 24h)', () => {
      it('returns RED when elapsed >= 1 day', () => {
        // 25h ago, cooldown 30 min
        expect(getCooldownColor(30, NOW - 25 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns RED at exactly 1 day boundary', () => {
        // 24h ago, cooldown 30 min
        expect(getCooldownColor(30, NOW - 24 * 3600_000)).toBe(COLORS.RED);
      });
    });

    describe('cooldown in hours (< 24h)', () => {
      it('returns RED when elapsed >= 1 day', () => {
        // 30h ago, cooldown 2h
        expect(getCooldownColor(120, NOW - 30 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns YELLOW when elapsed < 1 day', () => {
        // 10h ago, cooldown 2h
        expect(getCooldownColor(120, NOW - 10 * 3600_000)).toBe(COLORS.YELLOW);
      });
    });

    describe('cooldown in days (>= 24h)', () => {
      it('returns RED when elapsed >= 1 week', () => {
        // 10 days ago, cooldown 3 days
        expect(getCooldownColor(3 * 24 * 60, NOW - 10 * 24 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns RED at exactly 1 week boundary', () => {
        // 7 days ago, cooldown 3 days
        expect(getCooldownColor(3 * 24 * 60, NOW - 7 * 24 * 3600_000)).toBe(COLORS.RED);
      });

      it('returns YELLOW when elapsed < 1 week', () => {
        // 5 days ago, cooldown 3 days
        expect(getCooldownColor(3 * 24 * 60, NOW - 5 * 24 * 3600_000)).toBe(COLORS.YELLOW);
      });
    });
  });

  describe('cooldownType = limit (inverted colors)', () => {
    it('returns RED when within cooldown (opposite of rest)', () => {
      // 10 min ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 10 * 60_000, 'limit')).toBe(COLORS.RED);
    });

    it('returns YELLOW when past cooldown but within threshold', () => {
      // 31 min ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 31 * 60_000, 'limit')).toBe(COLORS.YELLOW);
    });

    it('returns GREEN when past 1 order of magnitude (opposite of rest)', () => {
      // 25h ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 25 * 3600_000, 'limit')).toBe(COLORS.GREEN);
    });

    it('returns GREEN at exactly 1 day boundary (limit)', () => {
      // 24h ago, cooldown 30 min
      expect(getCooldownColor(30, NOW - 24 * 3600_000, 'limit')).toBe(COLORS.GREEN);
    });
  });
});
