import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import type { TaskEntry } from '../src/types/task';
import { getCalendarStarMetrics, getCalendarTaskCompletionMetrics } from '../src/utils/calendarMetrics';

function makeBehavior(overrides: Partial<BehaviorEntry> = {}): BehaviorEntry {
  return {
    id: 'b1',
    name: 'Test',
    type: 'neutral',
    lastTimestamp: null,
    metadata: {},
    logs: [],
    cooldownMinutes: 0,
    ...overrides,
  };
}

function makeLog(date: string): LogEntry {
  return { id: `l-${date}`, timestamp: new Date(`${date}T12:00:00`).getTime() };
}

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id: 't1',
    title: 'Task',
    scheduledDate: '2026-06-20',
    stars: 1,
    completedDates: [],
    createdAt: new Date('2026-06-20T12:00:00').getTime(),
    ...overrides,
  };
}

describe('getCalendarStarMetrics', () => {
  it('aggregates daily behavior stars and task stars by date', () => {
    const behavior = makeBehavior({
      starThresholds: [1, 3, 5],
      logs: [makeLog('2026-06-20'), makeLog('2026-06-20'), makeLog('2026-06-20')],
    });
    const task = makeTask({
      stars: 2,
      completedDates: ['2026-06-20'],
    });

    expect(getCalendarStarMetrics([behavior], [task])).toEqual({
      '2026-06-20': { type: 'stars', value: 4 },
    });
  });

  it('adds weekly behavior stars to task-only dates in the same week', () => {
    const behavior = makeBehavior({
      starThresholds: [1, 3, 5],
      starPeriod: 'week',
      logs: [makeLog('2026-06-14'), makeLog('2026-06-15')],
    });
    const task = makeTask({
      stars: 2,
      completedDates: ['2026-06-20'],
    });

    expect(getCalendarStarMetrics([behavior], [task])).toEqual({
      '2026-06-14': { type: 'stars', value: 1 },
      '2026-06-15': { type: 'stars', value: 1 },
      '2026-06-20': { type: 'stars', value: 3 },
    });
  });

  it('ignores archived tasks and zero-star task completions', () => {
    const archived = makeTask({
      id: 'archived',
      archived: true,
      stars: 3,
      completedDates: ['2026-06-20'],
    });
    const zeroStar = makeTask({
      id: 'zero',
      stars: 0,
      completedDates: ['2026-06-21'],
    });

    expect(getCalendarStarMetrics([], [archived, zeroStar])).toEqual({});
  });
});

describe('getCalendarTaskCompletionMetrics', () => {
  it('counts non-archived task completions by date', () => {
    const tasks = [
      makeTask({ id: 'a', completedDates: ['2026-06-20', '2026-06-21'] }),
      makeTask({ id: 'b', completedDates: ['2026-06-20'] }),
      makeTask({ id: 'c', archived: true, completedDates: ['2026-06-20'] }),
    ];

    expect(getCalendarTaskCompletionMetrics(tasks)).toEqual({
      '2026-06-20': { type: 'tasks', value: 2 },
      '2026-06-21': { type: 'tasks', value: 1 },
    });
  });
});
