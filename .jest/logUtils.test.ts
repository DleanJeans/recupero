import { getLogDurationMinutes, getLogDurationSeconds, getLogFormTimestamp } from '../src/utils/log-utils';

describe('log duration precision', () => {
  it('keeps seconds in duration-based reward units', () => {
    const log = { id: 'log-1', timestamp: 0, endTimestamp: 90_000 };

    expect(getLogDurationSeconds(log)).toBe(90);
    expect(getLogDurationMinutes(log)).toBe(1.5);
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
