import type { CravingLog } from '../src/types/craving';
import {
  createCopingUrge,
  formatFullIn,
  getLearnedFullInHours,
  getUrgeState,
  getUrgeTone,
  sortUrges,
  toUrgeLevel,
} from '../src/utils/urge-utils';

const H = 3_600_000;
const T0 = new Date(2026, 10, 24, 8, 0).getTime();
const craving = (over: Partial<CravingLog>): CravingLog => ({
  id: 'c',
  behaviorId: 'b',
  startedAt: T0,
  rideMs: 600_000,
  ratings: [],
  ...over,
});

describe('learned full-in time', () => {
  it('needs two sessions', () => {
    expect(getLearnedFullInHours([])).toBeUndefined();
    expect(getLearnedFullInHours([T0])).toBeUndefined();
  });
  it('uses the median gap and merges logs within 30 min', () => {
    const logs = [T0, T0 + 10 * 60_000, T0 + 20 * H, T0 + 40 * H, T0 + 100 * H];
    // sessions at 0, 20, 40, 100 h -> gaps 20, 20, 60 -> median 20
    expect(getLearnedFullInHours(logs)).toBe(20);
  });
  it('clamps to 1h..60d', () => {
    expect(getLearnedFullInHours([T0, T0 + 40 * 60_000])).toBe(1);
    expect(getLearnedFullInHours([T0, T0 + 200 * 24 * H])).toBe(24 * 60);
  });
});

describe('urge level', () => {
  const urge = { ...createCopingUrge('b', T0 - 100 * H), fullInHours: 20 };

  it('rises from the last log and caps at 100', () => {
    expect(getUrgeState(urge, [T0], [], T0 + 10 * H).level).toBeCloseTo(50);
    expect(getUrgeState(urge, [T0], [], T0 + 30 * H).level).toBe(100);
  });
  it('starts from addedAt when never logged', () => {
    const fresh = { ...urge, addedAt: T0 };
    expect(getUrgeState(fresh, [], [], T0 + 5 * H).level).toBeCloseTo(25);
  });
  it('a rating sets the level, riding it out drops it, giving in resets it', () => {
    const rated = craving({ ratings: [{ ts: T0 + 2 * H, level: 4 }], outcome: 'resisted', endedAt: T0 + 2 * H });
    // 2h: rated 4 -> 80, then resisted -> 40, then +5/h for 2h -> 50
    expect(getUrgeState(urge, [T0], [rated], T0 + 4 * H).level).toBeCloseTo(50);
    const gaveIn = craving({ outcome: 'gaveIn', endedAt: T0 + 8 * H });
    expect(getUrgeState(urge, [T0], [gaveIn], T0 + 10 * H).level).toBeCloseTo(10);
  });
  it('ignores cravings from before the last log and for other behaviours', () => {
    const old = craving({ outcome: 'gaveIn', endedAt: T0 - H });
    const other = craving({ behaviorId: 'x', outcome: 'gaveIn', endedAt: T0 + 5 * H });
    expect(getUrgeState(urge, [T0], [old, other], T0 + 10 * H).level).toBeCloseTo(50);
  });
  it('predicts when it crosses the line', () => {
    const state = getUrgeState(urge, [T0], [], T0 + 10 * H);
    expect(state.crossesLineAt).toBe(T0 + 14 * H);
    expect(getUrgeState(urge, [T0], [], T0 + 15 * H).crossesLineAt).toBeUndefined();
  });
  it('falls back to 24h without a set or learned rate', () => {
    const auto = { ...urge, fullInHours: undefined };
    const state = getUrgeState(auto, [T0], [], T0 + 12 * H);
    expect(state.learned).toBe(true);
    expect(state.level).toBeCloseTo(50);
  });
});

describe('helpers', () => {
  it('maps level to 1-5', () => {
    expect(toUrgeLevel(0)).toBe(1);
    expect(toUrgeLevel(41)).toBe(3);
    expect(toUrgeLevel(100)).toBe(5);
  });
  it('tones', () => {
    expect(getUrgeTone(70, 70)).toBe('past');
    expect(getUrgeTone(50, 70)).toBe('near');
    expect(getUrgeTone(10, 70)).toBe('calm');
  });
  it('formats full-in', () => {
    expect(formatFullIn(20)).toBe('20h');
    expect(formatFullIn(72)).toBe('3d');
    expect(formatFullIn(24 * 21)).toBe('3w');
  });
  it('sorts by level relative to line', () => {
    const mk = (level: number, line: number) => ({
      urge: { ...createCopingUrge('b', 0), line },
      state: { level, perHour: 1, fullInHours: 1, learned: false },
    });
    expect(sortUrges([mk(50, 100), mk(60, 70)]).map(i => i.state.level)).toEqual([60, 50]);
  });
});
