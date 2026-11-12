import type { BehaviorEntry } from '../src/types/behavior';
import {
  formatLevelEta,
  getTimerLevelProgress,
  getTodayTimedLogs,
  getTotalLogDurationMs,
  shouldLogTimerSegment,
} from '../src/utils/timer-utils';
import { cumulativeXpForLevel, xpRequiredForLevel } from '../src/utils/xp-utils';

describe('getTimerLevelProgress', () => {
  it('splits the ring into earlier XP and this session', () => {
    const lv7 = cumulativeXpForLevel(7);
    const size = xpRequiredForLevel(7); // 340
    const progress = getTimerLevelProgress(lv7 + 280, 24.6);
    expect(progress.level).toBe(7);
    expect(progress.before).toBeCloseTo(280 / size);
    expect(progress.now).toBeCloseTo(304.6 / size);
    expect(progress.minutesToNext).toBe(36);
  });

  it('restarts from empty once the session crosses a level', () => {
    const lv8 = cumulativeXpForLevel(8);
    const progress = getTimerLevelProgress(lv8 - 10, 30);
    expect(progress.level).toBe(8);
    expect(progress.before).toBe(0);
    expect(progress.xpInLevel).toBeCloseTo(20);
  });
});

describe('formatLevelEta', () => {
  it('formats minutes and hours', () => {
    expect(formatLevelEta(35)).toBe('35m');
    expect(formatLevelEta(125)).toBe('2h 05m');
    expect(formatLevelEta(-3)).toBe('0m');
  });
});

describe('shouldLogTimerSegment', () => {
  it('skips accidental taps', () => {
    expect(shouldLogTimerSegment(0, 2_000)).toBe(false);
    expect(shouldLogTimerSegment(0, 5_000)).toBe(true);
  });
});

describe('getTodayTimedLogs', () => {
  it('keeps today timed logs, newest first', () => {
    const now = new Date(2026, 10, 12, 15, 0).getTime();
    const at = (h: number, m = 0, d = 12) => new Date(2026, 10, d, h, m).getTime();
    const behavior = {
      logs: [
        { id: 'a', timestamp: at(8), endTimestamp: at(8, 22) },
        { id: 'b', timestamp: at(11, 40), endTimestamp: at(11, 58) },
        { id: 'c', timestamp: at(9) },
        { id: 'd', timestamp: at(20, 0, 11), endTimestamp: at(20, 30, 11) },
      ],
    } as unknown as BehaviorEntry;
    const logs = getTodayTimedLogs(behavior, now, 0);
    expect(logs.map(log => log.id)).toEqual(['b', 'a']);
    expect(getTotalLogDurationMs(logs)).toBe(40 * 60_000);
  });
});
