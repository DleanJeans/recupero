import type { BehaviorEntry, Category } from '../src/types/behavior';
import type { TaskEntry } from '../src/types/task';
import { formatTaskTime, getTaskTimeSpentMs } from '../src/utils/task-time-utils';

const category = { id: 'c', metadataFields: [{ key: 't', label: 'Task', type: 'task' }] } as unknown as Category;
const behavior = {
  id: 'b',
  categoryId: 'c',
  logs: [
    { id: 'l1', timestamp: 0, endTimestamp: 600000, metadata: { t: 'task1' } },
    { id: 'l2', timestamp: 1000000, endTimestamp: 1300000, metadata: { t: 'task1' } },
    { id: 'l3', timestamp: 2000000, endTimestamp: 2060000, metadata: { t: 'other' } },
    { id: 'l4', timestamp: 3000000, metadata: { t: 'task1' } },
    { id: 'done', timestamp: 4000000, endTimestamp: 4120000 },
  ],
} as unknown as BehaviorEntry;
const tasks = [
  { id: 'task1', completedDates: [] },
  { id: 'task2', completedDates: [], completionLogIds: { d: 'done' } },
] as unknown as TaskEntry[];

describe('task time', () => {
  it('sums linked logs, completion logs and a running timer', () => {
    const totals = getTaskTimeSpentMs(
      [behavior],
      [category],
      tasks,
      [{ taskId: 'task1', startTimestamp: 5000000, stopTimestamp: undefined }],
      5060000,
    );
    expect(totals.get('task1')).toBe(600000 + 300000 + 60000);
    expect(totals.get('task2')).toBe(120000);
  });
  it('formats', () => {
    expect(formatTaskTime(30000)).toBeUndefined();
    expect(formatTaskTime(80 * 60000)).toBe('1h 20m');
    expect(formatTaskTime(120 * 60000)).toBe('2h');
    expect(formatTaskTime(45 * 60000)).toBe('45m');
  });
});
