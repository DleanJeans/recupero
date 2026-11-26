import {
  formatEstimate,
  formatStartTime,
  getAverageDurationMin,
  getDeadlineState,
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
  });
});
