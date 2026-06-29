import { formatStopwatchDuration } from '../src/utils/stopwatchUtils';

describe('formatStopwatchDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatStopwatchDuration(0)).toBe('00:00');
    expect(formatStopwatchDuration(5_000)).toBe('00:05');
    expect(formatStopwatchDuration(65_000)).toBe('01:05');
  });

  it('formats hours when present', () => {
    expect(formatStopwatchDuration(3_661_000)).toBe('1:01:01');
  });

  it('clamps negative durations to zero', () => {
    expect(formatStopwatchDuration(-1_000)).toBe('00:00');
  });
});
