import { minutesFromPercentPerMinute, percentPerMinuteFromMinutes } from '../src/utils/fill-rate-utils';

describe('fill rate conversion', () => {
  it('converts minutes to percent per minute and back', () => {
    expect(percentPerMinuteFromMinutes(120)).toBe('0.833');
    expect(percentPerMinuteFromMinutes(50)).toBe('2');
    expect(minutesFromPercentPerMinute(2)).toBe('50');
    expect(minutesFromPercentPerMinute(0.8)).toBe('125');
  });

  it('gives an empty text for invalid input', () => {
    expect(percentPerMinuteFromMinutes(0)).toBe('');
    expect(minutesFromPercentPerMinute(null)).toBe('');
  });
});
