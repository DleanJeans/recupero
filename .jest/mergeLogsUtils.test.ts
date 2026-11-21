import type { BehaviorEntry, Category, LogEntry } from '../src/types/behavior';
import { mergeBehaviorLogsInto, prepareMovedLogs } from '../src/utils/merge-logs-utils';

const catA: Category = {
  id: 'a',
  name: 'A',
  emoji: 'x',
  metadataFields: [
    { key: 'f1', label: 'Calories' },
    { key: 'f2', label: 'Fat' },
  ],
};
const catB: Category = { id: 'b', name: 'B', emoji: 'x', metadataFields: [{ key: 'g1', label: 'calories' }] };
const log = (id: string, timestamp: number, metadata?: LogEntry['metadata']): LogEntry => ({ id, timestamp, metadata });
const behavior = (id: string, categoryId: string, logs: LogEntry[]) =>
  ({ id, name: id, categoryId, logs, lastTimestamp: null }) as unknown as BehaviorEntry;

describe('merge logs', () => {
  it('keeps metadata within the same category', () => {
    const logs = [log('1', 1, { f1: 5 })];
    expect(prepareMovedLogs(logs, catA, catA)).toEqual({ logs, droppedCount: 0 });
  });
  it('maps by field name and drops unmatched values', () => {
    const r = prepareMovedLogs([log('1', 1, { f1: 5, f2: 2, notes: 'hi' })], catA, catB);
    expect(r.logs[0].metadata).toEqual({ g1: 5, notes: 'hi' });
    expect(r.droppedCount).toBe(1);
  });
  it('moves logs, sorts them and archives the source', () => {
    const out = mergeBehaviorLogsInto(
      [behavior('s', 'a', [log('1', 5)]), behavior('t', 'a', [log('2', 9), log('3', 1)])],
      [catA],
      's',
      't',
      true,
      100,
    );
    const [s, t] = out;
    expect(s.logs).toHaveLength(0);
    expect(s.archivedAt).toBe(100);
    expect(t.logs.map(l => l.id)).toEqual(['3', '1', '2']);
    expect(t.lastTimestamp).toBe(9);
  });
});
