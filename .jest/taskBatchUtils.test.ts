import type { TaskEntry } from '../src/types/task';
import { buildBatchUpdates, getCommonValue, getTimedState, nextTimedValue } from '../src/utils/task-batch-utils';

const task = (overrides: Partial<TaskEntry> = {}): TaskEntry => ({
  id: 't',
  title: 'Buy case',
  scheduledDate: '2026-11-21',
  stars: 1,
  completedDates: [],
  createdAt: 0,
  ...overrides,
});
const none = new Map<string, string>();

describe('getCommonValue', () => {
  it('tells none, same and mixed apart', () => {
    expect(getCommonValue([undefined, undefined])).toEqual({ kind: 'none' });
    expect(getCommonValue(['a', 'a'])).toEqual({ kind: 'same', value: 'a' });
    expect(getCommonValue(['a', 'b'])).toEqual({ kind: 'mixed' });
    expect(getCommonValue(['a', undefined])).toEqual({ kind: 'mixed' });
  });
});

describe('Track duration state', () => {
  it('reads on, off and mixed, and a tap turns mixed and off on', () => {
    expect(getTimedState([task({ timed: true }), task({ timed: true })])).toBe('on');
    expect(getTimedState([task(), task()])).toBe('off');
    expect(getTimedState([task({ timed: true }), task()])).toBe('mixed');
    expect(nextTimedValue('mixed')).toBe(true);
    expect(nextTimedValue('off')).toBe(true);
    expect(nextTimedValue('on')).toBe(false);
  });
});

describe('buildBatchUpdates', () => {
  it('changes nothing for fields left on Keep', () => {
    expect(buildBatchUpdates(task(), {}, none)).toEqual({});
  });

  it('sets the behavior and follows its name on behavior-named tasks', () => {
    const named = task({ source: 'behavior', behaviorId: 'old', title: 'Old' });
    expect(buildBatchUpdates(named, { behavior: { id: 'new', name: 'New' } }, none)).toMatchObject({
      behaviorId: 'new',
      title: 'New',
    });
    expect(buildBatchUpdates(task(), { behavior: { id: 'new', name: 'New' } }, none).title).toBeUndefined();
  });

  it('clearing the behavior turns a behavior-named task into a plain one', () => {
    const named = task({ source: 'behavior', behaviorId: 'old' });
    expect(buildBatchUpdates(named, { behavior: { id: undefined } }, none)).toMatchObject({
      behaviorId: undefined,
      source: 'oneOff',
    });
  });

  it('gives a task without a behavior the behavior of the app, but keeps an existing one', () => {
    const ids = new Map([['shopee', 'b-shopee']]);
    const edit = { app: { packageName: 'shopee', label: 'Shopee' } };
    expect(buildBatchUpdates(task(), edit, ids)).toMatchObject({ appPackage: 'shopee', behaviorId: 'b-shopee' });
    expect(buildBatchUpdates(task({ behaviorId: 'mine' }), edit, ids).behaviorId).toBeUndefined();
  });

  it('clears the app', () => {
    const updates = buildBatchUpdates(task({ appPackage: 'x', appLabel: 'X', timed: true }), { clearApp: true }, none);
    expect(updates).toMatchObject({ appPackage: undefined, appLabel: undefined, timed: undefined });
  });

  it('only times tasks that have a behavior or an app', () => {
    expect(buildBatchUpdates(task(), { timed: true }, none).timed).toBeUndefined();
    expect(buildBatchUpdates(task({ behaviorId: 'b' }), { timed: true }, none).timed).toBe(true);
    expect(buildBatchUpdates(task({ behaviorId: 'b', timed: true }), { timed: false }, none).timed).toBeUndefined();
  });

  it('sets place with its dwell, and clears both', () => {
    expect(buildBatchUpdates(task(), { place: { id: 'home', dwellMin: 10 } }, none)).toMatchObject({
      placeId: 'home',
      placeDwellMin: 10,
    });
    expect(buildBatchUpdates(task({ placeId: 'home' }), { place: { id: undefined, dwellMin: 5 } }, none)).toMatchObject(
      {
        placeId: undefined,
        placeDwellMin: undefined,
      },
    );
  });

  it('sets stars', () => {
    expect(buildBatchUpdates(task(), { stars: 3 }, none).stars).toBe(3);
  });
});
