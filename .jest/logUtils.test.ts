import { getLogFormTimestamp } from '../src/utils/logUtils';

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
});
