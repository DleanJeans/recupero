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
      [entry('a', day, day + HOUR, 's1'), entry('b', day, day + HOUR, 's1'), entry('c', day + 2 * HOUR)],
      [],
      [],
      '2026-11-01',
    );
    expect(items).toHaveLength(2);
    const stacked = items.find(item => item.kind === 'behavior' && item.entries.length === 2);
    expect(stacked).toBeDefined();
  });

  it('auto-stacks manual logs started within 3 minutes of the previous one', () => {
    const MIN = 60 * 1000;
    const items = buildDayTimeline(
      [entry('a', day), entry('b', day + 2 * MIN), entry('c', day + 5 * MIN), entry('d', day + 9 * MIN)],
      [],
      [],
      '2026-11-01',
    );
    const sizes = items.map(item => (item.kind === 'behavior' ? item.entries.length : 0));
    expect(sizes).toEqual([1, 3]);
  });

  it('does not auto-stack auto-tracked logs', () => {
    const tracked = entry('app', day + 60 * 1000);
    tracked.log.source = 'app-usage';
    const items = buildDayTimeline([entry('a', day), tracked], [], [], '2026-11-01');
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
