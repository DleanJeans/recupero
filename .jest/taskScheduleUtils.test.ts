import {
  formatEstimate,
  formatStartTime,
  getAverageDurationMin,
  getDeadlineState,
  getSuggestedStartTime,
  getTaskActualTime,
  isStartPassed,
  sortByStartTime,
} from '../src/utils/task-schedule-utils';

describe('task schedule utils', () => {
  it('averages only timed logs, in minutes', () => {
    const logs = [
      { id: 'a', timestamp: 0, endTimestamp: 20 * 60000 },
      { id: 'b', timestamp: 0, endTimestamp: 40 * 60000 },
      { id: 'c', timestamp: 5 },
    ];
    expect(getAverageDurationMin({ logs })).toBe(30);
    expect(getAverageDurationMin({ logs: [{ id: 'c', timestamp: 5 }] })).toBeUndefined();
  });

  it('formats estimates and start times', () => {
    expect(formatEstimate(45)).toBe('45m');
    expect(formatEstimate(60)).toBe('1h');
    expect(formatEstimate(80)).toBe('1h 20m');
    expect(formatStartTime('00:05')).toBe('12:05 AM');
    expect(formatStartTime('13:30')).toBe('1:30 PM');
  });

  it('reports the deadline state', () => {
    expect(getDeadlineState({}, '2026-11-26')).toBe('none');
    expect(getDeadlineState({ deadline: '2026-11-25' }, '2026-11-26')).toBe('overdue');
    expect(getDeadlineState({ deadline: '2026-11-26' }, '2026-11-26')).toBe('today');
    expect(getDeadlineState({ deadline: '2026-11-27' }, '2026-11-26')).toBe('upcoming');
    const now = new Date(2026, 10, 26, 13, 19);
    expect(getDeadlineState({ deadline: '2026-11-26', deadlineTime: '17:00' }, '2026-11-26', now)).toBe('today');
    expect(getDeadlineState({ deadline: '2026-11-26', deadlineTime: '13:00' }, '2026-11-26', now)).toBe('overdue');
  });

  it('detects a passed start time and suggests the next quarter hour', () => {
    const now = new Date(2026, 10, 26, 13, 19);
    expect(isStartPassed({ startTime: '13:00', scheduledDate: '2026-11-26' }, now, '2026-11-26')).toBe(true);
    expect(isStartPassed({ startTime: '14:00', scheduledDate: '2026-11-26' }, now, '2026-11-26')).toBe(false);
    expect(isStartPassed({ startTime: '09:00', scheduledDate: '2026-11-25' }, now, '2026-11-26')).toBe(true);
    expect(isStartPassed({ scheduledDate: '2026-11-26' }, now, '2026-11-26')).toBe(false);
    expect(getSuggestedStartTime(now)).toBe('13:30');
    expect(getSuggestedStartTime(new Date(2026, 10, 26, 23, 50))).toBe('23:45');
  });

  it('sorts by start time with unscheduled tasks last', () => {
    const base = { title: '', scheduledDate: '', stars: 0, completedDates: [] } as never;
    const t = (id: string, startTime: string | undefined, createdAt: number) =>
      ({ ...(base as object), id, startTime, createdAt }) as never;
    const sorted = sortByStartTime([t('a', undefined, 1), t('b', '14:00', 2), t('c', '09:00', 3)]) as { id: string }[];
    expect(sorted.map(x => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('finds the actual time a task was done', () => {
    const behavior = { logs: [{ id: 'l1', timestamp: 1000, endTimestamp: 5000 }] };
    const task = { completionLogIds: { '2026-11-26': 'l1' }, completedAtByDate: { '2026-11-26': 5000 } };
    expect(getTaskActualTime(task, behavior, '2026-11-26')).toEqual({ start: 1000, end: 5000 });
    expect(getTaskActualTime({ completedAtByDate: { d: 7 } }, undefined, 'd')).toEqual({ end: 7 });
    expect(getTaskActualTime({}, undefined, 'd')).toBeUndefined();
  });
});
