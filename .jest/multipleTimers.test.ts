import type { BehaviorEntry } from '../src/types/behavior';
import { getTimerFullInMs, withTimerLogs } from '../src/utils/need-utils';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn() },
}));

import { useTimerStore } from '../src/store/timer-store';

const behavior = (id: string): BehaviorEntry => ({ id, logs: [] }) as unknown as BehaviorEntry;

describe('withTimerLogs', () => {
  it('adds a stand-in log for each running timer and skips empty spans', () => {
    const result = withTimerLogs(
      [behavior('a'), behavior('b'), behavior('c')],
      [
        { behaviorId: 'a', start: 0, end: 60_000 },
        { behaviorId: 'b', start: 5, end: 5 },
      ],
    );
    expect(result[0].logs).toHaveLength(1);
    expect(result[0].logs[0]).toMatchObject({ timestamp: 0, endTimestamp: 60_000 });
    expect(result[1].logs).toHaveLength(0);
    expect(result[2].logs).toHaveLength(0);
  });
});

describe('getTimerFullInMs', () => {
  const hour = { mode: 'duration', fullMinutes: 60 } as const;
  it('counts down at the combined rate of duration refills', () => {
    expect(getTimerFullInMs(50, [hour])).toBe(30 * 60_000);
    expect(getTimerFullInMs(50, [hour, hour])).toBe(15 * 60_000);
  });
  it('is undefined without a duration refill or a level', () => {
    expect(getTimerFullInMs(50, [{ mode: 'set' } as never, undefined])).toBeUndefined();
    expect(getTimerFullInMs(undefined, [hour])).toBeUndefined();
  });
});

describe('timer store with several timers', () => {
  beforeEach(() => {
    useTimerStore.setState({ parked: [] });
    useTimerStore.getState().reset();
  });

  it('parks a running timer when another behavior starts, and switches back', () => {
    const store = useTimerStore.getState();
    store.start('a', 1000);
    store.start('b', 2000);
    let state = useTimerStore.getState();
    expect(state.lockedBehaviorId).toBe('b');
    expect(state.parked.map(session => session.lockedBehaviorId)).toEqual(['a']);
    expect(state.parked[0].startTimestamp).toBe(1000);

    state.switchTo('a');
    state = useTimerStore.getState();
    expect(state.lockedBehaviorId).toBe('a');
    expect(state.startTimestamp).toBe(1000);
    expect(state.parked.map(session => session.lockedBehaviorId)).toEqual(['b']);
  });

  it('brings a parked timer forward instead of restarting it', () => {
    const store = useTimerStore.getState();
    store.start('a', 1000);
    store.parkCurrent();
    expect(useTimerStore.getState().lockedBehaviorId).toBeUndefined();
    store.start('a', 5000);
    const state = useTimerStore.getState();
    expect(state.startTimestamp).toBe(1000);
    expect(state.parked).toHaveLength(0);
  });

  it('keeps parked timers when the open one is reset, and prunes deleted behaviors', () => {
    const store = useTimerStore.getState();
    store.start('a', 1000);
    store.start('b', 2000);
    store.reset();
    expect(useTimerStore.getState().parked).toHaveLength(1);
    store.pruneParked(new Set(['b']));
    expect(useTimerStore.getState().parked).toHaveLength(0);
  });
});
