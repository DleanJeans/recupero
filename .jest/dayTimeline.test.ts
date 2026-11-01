import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import type { BodySensationLog, MoodLog } from '../src/types/cue';
import type { DayLogEntry } from '../src/utils/behavior-utils';
import { buildDayTimeline } from '../src/utils/day-timeline-utils';

const day = new Date(2026, 10, 1, 9, 0, 0).getTime();
const HOUR = 60 * 60 * 1000;

function entry(id: string, timestamp: number, endTimestamp?: number, stackId?: string): DayLogEntry {
  const log: LogEntry = { id, timestamp, endTimestamp, stackId };
  return { log, behavior: { id: `b-${id}`, name: id, logs: [log] } as unknown as BehaviorEntry };
}

describe('buildDayTimeline', () => {
  it('groups logs sharing a stack id into one stack', () => {
    const items = buildDayTimeline(
      [entry('a', day, day + HOUR, 's1'), entry('b', day, day + HOUR, 's1'), entry('c', day)],
      [],
      [],
      '2026-11-01',
    );
    expect(items).toHaveLength(2);
    const stacked = items.find(item => item.kind === 'behavior' && item.entries.length === 2);
    expect(stacked).toBeDefined();
  });

  it('keeps logs that only share a time apart', () => {
    const items = buildDayTimeline([entry('a', day, day + HOUR), entry('b', day, day + HOUR)], [], [], '2026-11-01');
    expect(items).toHaveLength(2);
  });

  it('merges moods and body sensations for the date, newest first', () => {
    const moods: MoodLog[] = [
      { id: 'm1', mood: 'good', ts: day + 2 * HOUR },
      { id: 'm-old', mood: 'low', ts: day - 48 * HOUR },
    ];
    const body: BodySensationLog[] = [{ id: 's1', sensation: 'hungry', ts: day + HOUR }];
    const items = buildDayTimeline([entry('a', day + 3 * HOUR)], moods, body, '2026-11-01');
    expect(items.map(item => item.kind)).toEqual(['behavior', 'mood', 'body']);
  });
});
