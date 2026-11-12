import type { LogEntry } from '../src/types/behavior';
import { prefersTimer } from '../src/utils/log-action-utils';

const log = (timestamp: number, minutes?: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id: `l${timestamp}`,
  timestamp,
  endTimestamp: minutes != null ? timestamp + minutes * 60_000 : undefined,
  ...extra,
});

describe('prefersTimer', () => {
  it('is false with no logs', () => {
    expect(prefersTimer({ logs: [] })).toBe(false);
  });

  it('is true for duration XP behaviours', () => {
    expect(prefersTimer({ logs: [], durationXpEnabled: true })).toBe(true);
  });

  it('is true when at least half of recent logs have a duration', () => {
    expect(prefersTimer({ logs: [log(1, 30), log(2), log(3, 20), log(4)] })).toBe(true);
  });

  it('is false when most recent logs are instant', () => {
    expect(prefersTimer({ logs: [log(1, 30), log(2), log(3), log(4)] })).toBe(false);
  });

  it('only looks at the latest 10 logs', () => {
    const oldTimed = Array.from({ length: 20 }, (_, i) => log(i, 30));
    const recentInstant = Array.from({ length: 10 }, (_, i) => log(100 + i));
    expect(prefersTimer({ logs: [...oldTimed, ...recentInstant] })).toBe(false);
  });

  it('ignores automatic logs', () => {
    expect(
      prefersTimer({ logs: [log(1), log(2, 60, { source: 'app-usage' }), log(3, 60, { source: 'app-usage' })] }),
    ).toBe(false);
  });
});
