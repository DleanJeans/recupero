import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import { rankStackSuggestions } from '../src/utils/stack-suggestion-utils';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const t0 = new Date(2026, 10, 1, 9, 0, 0).getTime();

function behavior(id: string, logs: Partial<LogEntry>[] = [], extra: Partial<BehaviorEntry> = {}): BehaviorEntry {
  const fullLogs = logs.map((log, index) => ({ id: `${id}-${index}`, timestamp: t0, ...log }));
  return {
    id,
    name: id,
    logs: fullLogs,
    lastTimestamp: fullLogs.length ? Math.max(...fullLogs.map(log => log.timestamp)) : null,
    ...extra,
  } as unknown as BehaviorEntry;
}

const ids = (current: BehaviorEntry | undefined, behaviors: BehaviorEntry[], exclude: string[] = []) =>
  rankStackSuggestions(behaviors, current, exclude).map(s => `${s.behavior.id}:${s.group}`);

describe('rankStackSuggestions', () => {
  it('puts stacked-before first, then same category, then the rest', () => {
    const current = behavior('cur', [{ timestamp: t0, stackId: 's1' }], { categoryId: 'c1' });
    const stacked = behavior('stacked', [{ timestamp: t0, stackId: 's1' }]);
    const sameCat = behavior('sameCat', [{ timestamp: t0 + 5 * HOUR }], { categoryId: 'c1' });
    const other = behavior('other', [{ timestamp: t0 + 9 * HOUR }], { categoryId: 'c2' });
    expect(ids(current, [other, sameCat, current, stacked])).toEqual([
      'stacked:stacked',
      'sameCat:category',
      'other:other',
    ]);
  });

  it('ranks stacked behaviours by count, then by most recent stack', () => {
    const current = behavior('cur', [
      { timestamp: t0, stackId: 's1' },
      { timestamp: t0 + HOUR, stackId: 's2' },
      { timestamp: t0 + 2 * HOUR, stackId: 's3' },
    ]);
    const twice = behavior('twice', [
      { timestamp: t0, stackId: 's1' },
      { timestamp: t0 + HOUR, stackId: 's2' },
    ]);
    const onceRecent = behavior('onceRecent', [{ timestamp: t0 + 2 * HOUR, stackId: 's3' }]);
    const onceOld = behavior('onceOld', [{ timestamp: t0 + HOUR, stackId: 's2' }]);
    expect(ids(current, [onceOld, onceRecent, twice])).toEqual([
      'twice:stacked',
      'onceRecent:stacked',
      'onceOld:stacked',
    ]);
  });

  it('counts manual logs started within 3 minutes as stacked, but not auto-tracked ones', () => {
    const current = behavior('cur', [{ timestamp: t0 }]);
    const near = behavior('near', [{ timestamp: t0 + 2 * MIN }]);
    const far = behavior('far', [{ timestamp: t0 + 10 * MIN }]);
    const tracked = behavior('tracked', [{ timestamp: t0 + MIN, source: 'app-usage' }]);
    expect(ids(current, [far, tracked, near])).toEqual(['near:stacked', 'far:other', 'tracked:other']);
  });

  it('leaves out excluded behaviours and ignores category when the current one has none', () => {
    const current = behavior('cur');
    const a = behavior('a', [{ timestamp: t0 + HOUR }]);
    const b = behavior('b', [{ timestamp: t0 }]);
    expect(ids(current, [b, a, current], ['b'])).toEqual(['a:other']);
  });

  it('sorts by most recent log when there is no current behaviour', () => {
    const a = behavior('a', [{ timestamp: t0 }]);
    const b = behavior('b', [{ timestamp: t0 + HOUR }]);
    expect(ids(undefined, [a, b])).toEqual(['b:other', 'a:other']);
  });
});
