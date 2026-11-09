import type { BehaviorEntry } from '../src/types/behavior';
import type { Checklist, ChecklistRun } from '../src/types/checklist';
import {
  describeChecklistStatus,
  getChecklistProgress,
  getDragShift,
  getRunnableItems,
  getStripSettleTarget,
  getStripSwipe,
  getTodayRun,
  isRunDone,
  moveItem,
  pruneRun,
} from '../src/utils/checklist-utils';
import { toDateString } from '../src/utils/date-utils';

const behavior = (id: string, extra: Partial<BehaviorEntry> = {}): BehaviorEntry => ({
  id,
  name: id,
  type: 'desirable',
  lastTimestamp: null,
  metadata: {},
  logs: [],
  cooldownMinutes: 0,
  ...extra,
});

const checklist: Checklist = {
  id: 'morning',
  name: 'Morning',
  createdAt: 0,
  items: [
    { id: 'i1', kind: 'behavior', behaviorId: 'teeth' },
    { id: 'i2', kind: 'behavior', behaviorId: 'face' },
    { id: 'i3', kind: 'plain', label: 'Keys' },
    { id: 'i4', kind: 'behavior', behaviorId: 'gone' },
  ],
};

const run = (ticks: ChecklistRun['ticks'], extra: Partial<ChecklistRun> = {}): ChecklistRun => ({
  date: '2026-11-09',
  startedAt: 0,
  stackId: 's',
  ticks,
  ...extra,
});

describe('checklist-utils', () => {
  const behaviors = [behavior('teeth', { logs: [{ id: 'log1', timestamp: 1 }] }), behavior('face', { archivedAt: 5 })];

  it('drops deleted and archived behaviours from a run, keeps plain items', () => {
    expect(getRunnableItems(checklist, behaviors).map(item => item.id)).toEqual(['i1', 'i3']);
  });

  it('only uses a run from today', () => {
    expect(getTodayRun(run({}), '2026-11-09')).toBeDefined();
    expect(getTodayRun(run({}), '2026-11-10')).toBeUndefined();
  });

  it('counts done and skipped items towards completion', () => {
    const items = getRunnableItems(checklist, behaviors);
    expect(getChecklistProgress(items, undefined)).toEqual({ done: 0, skipped: 0, total: 2, complete: false });
    const partial = run({ i1: { at: 1, logId: 'log1', behaviorId: 'teeth' } });
    expect(getChecklistProgress(items, partial)).toMatchObject({ done: 1, complete: false });
    const full = run({ i1: { at: 1 }, i3: { at: 2, skipped: true } });
    expect(getChecklistProgress(items, full)).toEqual({ done: 1, skipped: 1, total: 2, complete: true });
    expect(isRunDone(full, getChecklistProgress(items, full))).toBe(true);
    expect(isRunDone(run({}, { finishedAt: 3 }), getChecklistProgress(items, run({})))).toBe(true);
  });

  it('forgets a tick whose log was deleted', () => {
    const live = run({ i1: { at: 1, logId: 'log1', behaviorId: 'teeth' } });
    expect(pruneRun(live, behaviors)).toBe(live);
    const stale = run({ i1: { at: 1, logId: 'missing', behaviorId: 'teeth' }, i3: { at: 2 } }, { finishedAt: 9 });
    const pruned = pruneRun(stale, behaviors);
    expect(Object.keys(pruned?.ticks ?? {})).toEqual(['i3']);
    expect(pruned?.finishedAt).toBeUndefined();
  });

  it('moves items and clamps the target', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'c', 'b']);
  });

  it('shifts the rows a dragged row passes over', () => {
    const down = { from: 0, to: 2 };
    expect([0, 1, 2, 3].map(index => getDragShift(index, down))).toEqual([0, -1, -1, 0]);
    const up = { from: 3, to: 1 };
    expect([0, 1, 2, 3].map(index => getDragShift(index, up))).toEqual([0, 1, 1, 0]);
    expect(getDragShift(1, null)).toBe(0);
  });

  it('reads a vertical swipe on the strip, ignoring horizontal scrolling', () => {
    expect(getStripSwipe(2, 40)).toBe('expand');
    expect(getStripSwipe(-3, -40)).toBe('collapse');
    expect(getStripSwipe(60, 30)).toBeNull();
    expect(getStripSwipe(0, 10)).toBeNull();
    expect(getStripSwipe(30, 40)).toBeNull();
  });

  it('settles the strip by flick direction, else by the nearer end', () => {
    expect(getStripSettleTarget(0.2, 1)).toBe(true);
    expect(getStripSettleTarget(0.9, -1)).toBe(false);
    expect(getStripSettleTarget(0.6, 0.1)).toBe(true);
    expect(getStripSettleTarget(0.4, -0.1)).toBe(false);
  });

  it('describes status for the Routines strip', () => {
    const today = toDateString(new Date(), 0);
    const items = getRunnableItems(checklist, behaviors);
    const empty = getChecklistProgress(items, undefined);
    expect(describeChecklistStatus(checklist, undefined, empty, 0)).toBe('2 items');
    const partialRun = run({ i1: { at: 1 } }, { date: today });
    expect(describeChecklistStatus(checklist, partialRun, getChecklistProgress(items, partialRun), 0)).toBe('1 of 2');
    const finished = run({}, { date: today, finishedAt: Date.now() });
    expect(describeChecklistStatus(checklist, finished, empty, 0)).toBe('Done today');
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    expect(describeChecklistStatus({ ...checklist, lastCompletedAt: yesterday }, undefined, empty, 0)).toBe(
      'Done yesterday',
    );
  });
});
