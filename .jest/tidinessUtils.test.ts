import type { BehaviorEntry } from '../src/types/behavior';
import type { TidyMark, TidySpot } from '../src/types/tidiness';
import {
  clampRect,
  getMessiestSpot,
  getNextLowSpot,
  getOverallTidiness,
  getSpotPins,
  getSpotState,
  getTidinessNeedOverride,
  learnSpotEmptyHours,
  matchStarterBehaviors,
  TIDY_PLAN_COLUMNS,
} from '../src/utils/tidiness-utils';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 10, 21, 8);

function spot(partial: Partial<TidySpot> = {}): TidySpot {
  return {
    id: 'sink',
    roomId: 'kitchen',
    name: 'Sink',
    emoji: '🚰',
    emptyHours: 48,
    weight: 2,
    behaviorIds: [],
    learnedFrom: 0,
    createdAt: T0 - 100 * HOUR,
    ...partial,
  };
}

function behavior(id: string, name: string, timestamps: number[]): BehaviorEntry {
  return {
    id,
    name,
    type: 'desirable',
    lastTimestamp: timestamps.at(-1) ?? null,
    metadata: {},
    logs: timestamps.map((timestamp, index) => ({ id: `${id}-${index}`, timestamp })),
    cooldownMinutes: 0,
  } as unknown as BehaviorEntry;
}

function mark(partial: Partial<TidyMark>): TidyMark {
  return { id: 'm', spotId: 'sink', ts: T0, level: 100, checkIn: false, ...partial };
}

describe('getSpotState', () => {
  it('is unknown before any clean or check-in', () => {
    expect(getSpotState(spot(), [], [], T0).level).toBeUndefined();
  });

  it('decays from the last mark at the spot rate', () => {
    const state = getSpotState(spot(), [mark({ ts: T0 })], [], T0 + 12 * HOUR);
    expect(state.level).toBeCloseTo(75);
    expect(state.lastCleaned?.ts).toBe(T0);
  });

  it('counts a linked behaviour log as a clean', () => {
    const dishes = behavior('dishes', 'Wash dishes', [T0 + 6 * HOUR]);
    const state = getSpotState(
      spot({ behaviorIds: ['dishes'] }),
      [mark({ ts: T0, level: 20, checkIn: true })],
      [dishes],
      T0 + 6 * HOUR,
    );
    expect(state.level).toBe(100);
    expect(state.lastCleaned?.behaviorId).toBe('dishes');
  });

  it('ignores logs from before the spot was made', () => {
    const dishes = behavior('dishes', 'Wash dishes', [T0 - HOUR]);
    const state = getSpotState(spot({ behaviorIds: ['dishes'], createdAt: T0 }), [], [dishes], T0 + HOUR);
    expect(state.level).toBeUndefined();
  });

  it('uses a check-in level without counting it as a clean', () => {
    const state = getSpotState(spot(), [mark({ ts: T0, level: 40, checkIn: true })], [], T0);
    expect(state.level).toBe(40);
    expect(state.lastCleaned).toBeUndefined();
  });
});

describe('overall tidiness', () => {
  it('is the weighted average of known spots', () => {
    const a = getSpotState(spot({ id: 'a', weight: 3 }), [mark({ spotId: 'a', level: 20, checkIn: true })], [], T0);
    const b = getSpotState(spot({ id: 'b', weight: 1 }), [mark({ spotId: 'b', level: 100 })], [], T0);
    const c = getSpotState(spot({ id: 'c' }), [], [], T0);
    const overall = getOverallTidiness([a, b, c]);
    expect(overall.level).toBeCloseTo(40);
    expect(overall.emptyHours).toBeCloseTo(48);
    expect(getMessiestSpot([a, b, c])?.spot.id).toBe('a');
  });

  it('finds the next spot to drop below the low line', () => {
    const a = getSpotState(spot({ id: 'a', emptyHours: 100 }), [mark({ spotId: 'a', level: 80 })], [], T0);
    const b = getSpotState(spot({ id: 'b', emptyHours: 10 }), [mark({ spotId: 'b', level: 60 })], [], T0);
    const next = getNextLowSpot([a, b], T0);
    expect(next?.state.spot.id).toBe('b');
    expect(next?.at).toBe(T0 + 3 * HOUR);
  });

  it('leaves the need alone until there are spots', () => {
    expect(getTidinessNeedOverride([], [], [], T0)).toBeUndefined();
    const override = getTidinessNeedOverride(
      [spot({ behaviorIds: ['x'] })],
      [mark({ level: 50, checkIn: true })],
      [],
      T0,
    );
    expect(override?.level).toBe(50);
    expect(override?.refillBehaviorIds).toEqual(['x']);
  });
});

describe('learnSpotEmptyHours', () => {
  it('moves toward the implied rate, at most 15%', () => {
    // Fell 100 -> 0 in 12 h, but the spot thinks 48 h: speed up by the 15% cap.
    const hours = learnSpotEmptyHours(48, { ts: T0, level: 100 }, { ts: T0 + 12 * HOUR, level: 0 });
    expect(hours).toBeCloseTo(48 / 1.15, 1);
  });

  it('ignores a check-in right after the anchor', () => {
    expect(learnSpotEmptyHours(48, { ts: T0, level: 100 }, { ts: T0 + 60_000, level: 0 })).toBe(48);
  });
});

describe('floor plan', () => {
  it('keeps tiles on the grid', () => {
    expect(clampRect({ x: 11.6, y: -2, w: 4.4, h: 0.2 })).toEqual({ x: TIDY_PLAN_COLUMNS - 4, y: 0, w: 4, h: 1 });
  });

  it('places unpinned spots inside their room', () => {
    const pins = getSpotPins([spot({ id: 'a' }), spot({ id: 'b' }), spot({ id: 'c', pin: { x: 0.2, y: 0.3 } })]);
    expect(pins.get('c')).toEqual({ x: 0.2, y: 0.3 });
    expect(pins.get('a')?.x).toBeCloseTo(0.25);
    expect(pins.get('b')?.x).toBeCloseTo(0.75);
  });

  it('links starter spots to behaviours by name', () => {
    const behaviors = [behavior('d', 'Wash dishes', []), behavior('v', 'Vacuum', [])];
    expect(matchStarterBehaviors({ name: 'Sink', emoji: '', days: 2, weight: 3, match: /dish/i }, behaviors)).toEqual([
      'd',
    ]);
  });
});
