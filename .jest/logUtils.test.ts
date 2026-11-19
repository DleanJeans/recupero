import {
  getLogDurationMinutes,
  getLogDurationSeconds,
  getLogFormTimestamp,
  getOvernightEndTimestamp,
  getTimeRangeDurationMs,
} from '../src/utils/log-utils';
import { getTimerXp } from '../src/utils/xp-utils';

describe('log duration precision', () => {
  it('rounds duration-based XP to the nearest minute', () => {
    expect(getLogDurationMinutes({ id: 'log-1', timestamp: 0, endTimestamp: 29_000 })).toBe(0);
    expect(getLogDurationMinutes({ id: 'log-2', timestamp: 0, endTimestamp: 30_000 })).toBe(1);
    expect(getLogDurationMinutes({ id: 'log-3', timestamp: 0, endTimestamp: 89_000 })).toBe(1);
    expect(getLogDurationMinutes({ id: 'log-4', timestamp: 0, endTimestamp: 90_000 })).toBe(2);
  });

  it('keeps the raw duration in seconds for money calculations', () => {
    expect(getLogDurationSeconds({ id: 'log-1', timestamp: 0, endTimestamp: 90_000 })).toBe(90);
  });

  it('rounds Timer XP to one decimal place without float artifacts', () => {
    expect(getTimerXp(30_000)).toBe(0.5);
    expect(getTimerXp(90_000)).toBe(1.5);
    expect(getTimerXp(126_000)).toBe(2.1);
  });
});

describe('getLogFormTimestamp', () => {
  it('saves an early-morning time on the current calendar date after the cutoff has passed', () => {
    const maxTimestamp = new Date(2026, 5, 30, 8, 59, 0, 0).getTime();

    expect(getLogFormTimestamp('2026-06-30', 3, 59, 4, maxTimestamp)).toBe(
      new Date(2026, 5, 30, 3, 59, 0, 0).getTime(),
    );
  });

  it('keeps an early-morning time on the next calendar date while before the cutoff', () => {
    const maxTimestamp = new Date(2026, 5, 30, 2, 30, 0, 0).getTime();

    expect(getLogFormTimestamp('2026-06-29', 2, 15, 4, maxTimestamp)).toBe(
      new Date(2026, 5, 30, 2, 15, 0, 0).getTime(),
    );
  });

  it('preserves seconds when building a log timestamp', () => {
    const maxTimestamp = new Date(2026, 5, 30, 23, 59, 59).getTime();

    expect(getLogFormTimestamp('2026-06-30', 9, 5, 0, maxTimestamp, 30)).toBe(
      new Date(2026, 5, 30, 9, 5, 30).getTime(),
    );
  });
});

describe('overnight time ranges', () => {
  it('computes a 9 PM to 5 AM duration as 8 hours', () => {
    expect(getTimeRangeDurationMs(21 * 3600, 5 * 3600)).toBe(8 * 3600 * 1000);
    expect(getTimeRangeDurationMs(10 * 3600, 11 * 3600)).toBe(3600 * 1000);
    expect(getTimeRangeDurationMs(3600, 3600)).toBe(0);
  });

  it('rolls an end before the start to the next day', () => {
    const start = new Date(2026, 10, 17, 21, 0).getTime();
    const end = new Date(2026, 10, 17, 5, 0).getTime();
    expect(getOvernightEndTimestamp(start, end)).toBe(new Date(2026, 10, 18, 5, 0).getTime());
    expect(getOvernightEndTimestamp(end, start)).toBe(start);
  });
});
