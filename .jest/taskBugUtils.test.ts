import type { TaskEntry } from '../src/types/task';
import {
  formatBugSummary,
  getBugHeat,
  getBugHeatFill,
  getBugNudgeTask,
  getFixFirstTasks,
  getHeatSeries,
  sortByBugHeat,
} from '../src/utils/task-bug-utils';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-24T12:00:00').getTime();

function makeTask(id: string, daysAgo: number[], extra: Partial<TaskEntry> = {}): TaskEntry {
  return {
    id,
    title: id,
    scheduledDate: '2026-11-01',
    stars: 1,
    completedDates: [],
    createdAt: Number(id.replace(/\D/g, '')) || 0,
    bugs: daysAgo.map(d => ({ at: NOW - d * DAY })),
    ...extra,
  };
}

describe('getBugHeat', () => {
  it('is 1 for a bug just now and halves every 14 days', () => {
    expect(getBugHeat([{ at: NOW }], NOW)).toBeCloseTo(1);
    expect(getBugHeat([{ at: NOW - 14 * DAY }], NOW)).toBeCloseTo(0.5);
    expect(getBugHeat([{ at: NOW - 28 * DAY }], NOW)).toBeCloseTo(0.25);
  });
  it('is 0 without bugs and caps the fill at 1', () => {
    expect(getBugHeat(undefined, NOW)).toBe(0);
    expect(getBugHeatFill(10)).toBe(1);
    expect(getBugHeatFill(2)).toBeCloseTo(0.5);
  });
});

describe('sorting and Fix first', () => {
  const umbrella = makeTask('t1', [0, 3, 10, 17, 21]);
  const rack = makeTask('t2', [20, 21, 22, 23]);
  const plain = makeTask('t3', []);

  it('ranks recent bugs above more, older bugs', () => {
    expect(sortByBugHeat([plain, rack, umbrella], NOW).map(t => t.id)).toEqual(['t1', 't2', 't3']);
  });
  it('keeps oldest first for equal heat', () => {
    const a = makeTask('t5', []);
    const b = makeTask('t4', []);
    expect(sortByBugHeat([a, b], NOW).map(t => t.id)).toEqual(['t4', 't5']);
  });
  it('lists hot open eligible tasks only', () => {
    const done = makeTask('t6', [0, 1, 2], { completedDates: ['2026-11-20'] });
    const later = makeTask('t7', [0, 1, 2]);
    const result = getFixFirstTasks([umbrella, rack, plain, done, later], NOW, task => task.id !== 't7');
    expect(result.map(t => t.id)).toEqual(['t1', 't2']);
  });
});

describe('getBugNudgeTask', () => {
  it('needs 3 bugs within 2 weeks', () => {
    expect(getBugNudgeTask([makeTask('t1', [0, 5, 10])], NOW, () => true)?.id).toBe('t1');
    expect(getBugNudgeTask([makeTask('t1', [0, 5, 20])], NOW, () => true)).toBeUndefined();
  });
  it('only counts bugs after a dismissal', () => {
    const task = makeTask('t1', [0, 5, 10], { bugNudgeDismissedAt: NOW - 2 * DAY });
    expect(getBugNudgeTask([task], NOW, () => true)).toBeUndefined();
  });
});

describe('formatting and series', () => {
  it('summarises count and last time', () => {
    expect(formatBugSummary(makeTask('t1', [2, 9]), NOW)).toBe('2 bugs · 2d ago');
    expect(formatBugSummary(makeTask('t1', [0]), NOW)).toBe('1 bug · now');
    expect(formatBugSummary(makeTask('t1', []), NOW)).toBeUndefined();
  });
  it('builds a heat series ending today', () => {
    const series = getHeatSeries(makeTask('t1', [0]).bugs, NOW, 5);
    expect(series).toHaveLength(5);
    expect(series[0]).toBe(0);
    expect(series[4]).toBeCloseTo(1);
  });
});
