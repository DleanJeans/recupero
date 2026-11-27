import type { BehaviorEntry } from '../src/types/behavior';
import {
  addEffectSample,
  describeEffectForecast,
  EFFECT_WINDOW_MS,
  findEffectCandidates,
  forecastEffect,
  formatEffect,
} from '../src/utils/need-effect-utils';
import { DEFAULT_NEED_CONFIGS, getNeedEvents, simulateNeed, TIMER_PREVIEW_LOG_ID } from '../src/utils/need-utils';

const H = 3_600_000;
const T0 = new Date(2026, 10, 27, 12, 0, 0).getTime();

const makeBehavior = (id: string, logs: BehaviorEntry['logs'], extra: Partial<BehaviorEntry> = {}): BehaviorEntry =>
  ({ id, name: id, type: 'desirable', logs, lastTimestamp: null, ...extra }) as BehaviorEntry;

describe('need effects in the level model', () => {
  const config = (effect: { kind: 'by' | 'to'; amount: number }) => ({
    ...DEFAULT_NEED_CONFIGS.energy,
    refills: {},
    checkIns: [],
    effects: { workout: { ...effect, source: 'you' as const, seen: 0 } },
  });
  const checkIn = { id: 'c', needId: 'energy', ts: T0, level: 80, source: 'tap' as const };

  it('drops by a fixed amount when the log ends', () => {
    const workout = makeBehavior('workout', [{ id: 'w', timestamp: T0 + H, endTimestamp: T0 + 2 * H }]);
    const events = getNeedEvents('energy', config({ kind: 'by', amount: -20 }), [workout], [checkIn], undefined, 0);
    expect(events[1]).toMatchObject({ ts: T0 + 2 * H, kind: 'add', amount: -20, effect: true });
    const decay = 100 / 16;
    expect(simulateNeed(events, decay, T0 + 2 * H).level).toBeCloseTo(80 - 2 * decay - 20);
  });

  it('takes the level down to a value and never raises it', () => {
    const workout = makeBehavior('workout', [{ id: 'w', timestamp: T0 + H }]);
    const events = getNeedEvents('energy', config({ kind: 'to', amount: 25 }), [workout], [checkIn], undefined, 0);
    expect(simulateNeed(events, 0, T0 + H).level).toBe(25);
    const low = { ...checkIn, level: 10 };
    const lowEvents = getNeedEvents('energy', config({ kind: 'to', amount: 25 }), [workout], [low], undefined, 0);
    expect(simulateNeed(lowEvents, 0, T0 + H).level).toBe(10);
  });

  it("doesn't count as a refill, nor while its timer still runs", () => {
    const workout = makeBehavior('workout', [{ id: TIMER_PREVIEW_LOG_ID, timestamp: T0, endTimestamp: T0 + H }]);
    expect(getNeedEvents('energy', config({ kind: 'by', amount: -20 }), [workout], [], undefined, 0)).toEqual([]);
    const done = makeBehavior('workout', [{ id: 'w', timestamp: T0 }]);
    const events = getNeedEvents('energy', config({ kind: 'by', amount: -20 }), [done], [checkIn], undefined, 0);
    expect(simulateNeed(events, 0, T0 + H).lastRefillAt).toBeUndefined();
  });
});

describe('findEffectCandidates', () => {
  it('finds behaviours that ended in the window, newest first, skipping ones that refill the need', () => {
    const behaviors = [
      makeBehavior('workout', [{ id: 'w', timestamp: T0 - 40 * 60_000, endTimestamp: T0 - 10 * 60_000 }]),
      makeBehavior('lunch', [{ id: 'l', timestamp: T0 - 60 * 60_000 }]),
      makeBehavior('old', [{ id: 'o', timestamp: T0 - EFFECT_WINDOW_MS - 1 }]),
      makeBehavior('nap', [{ id: 'n', timestamp: T0 - 5 * 60_000 }]),
      makeBehavior('gone', [{ id: 'g', timestamp: T0 - 5 * 60_000 }], { archivedAt: 1 }),
    ];
    const config = { refills: { nap: { mode: 'set' as const } } };
    expect(findEffectCandidates(behaviors, config, T0).map(c => c.behaviorId)).toEqual(['workout', 'lunch']);
  });
});

describe('addEffectSample', () => {
  it('starts a drop as "down to" where you checked in', () => {
    expect(addEffectSample(undefined, { expected: 62, actual: 25 })).toMatchObject({
      kind: 'to',
      amount: 25,
      source: 'learned',
      seen: 1,
    });
  });

  it('keeps "down to" when you always end up near the same level', () => {
    let effect = addEffectSample(undefined, { expected: 80, actual: 25 });
    effect = addEffectSample(effect, { expected: 50, actual: 22 });
    effect = addEffectSample(effect, { expected: 65, actual: 28 });
    expect(effect).toMatchObject({ kind: 'to', amount: 25, seen: 3 });
  });

  it('switches to "drop by" when the drop size is what stays the same', () => {
    let effect = addEffectSample(undefined, { expected: 80, actual: 60 });
    effect = addEffectSample(effect, { expected: 50, actual: 31 });
    effect = addEffectSample(effect, { expected: 65, actual: 44 });
    expect(effect).toMatchObject({ kind: 'by', amount: -20 });
  });

  it('learns a rise as "by"', () => {
    expect(addEffectSample(undefined, { expected: 30, actual: 45 })).toMatchObject({ kind: 'by', amount: 15 });
  });
});

describe('effect display', () => {
  it('formats and forecasts', () => {
    expect(formatEffect({ kind: 'by', amount: -20 })).toBe('−20%');
    expect(formatEffect({ kind: 'by', amount: 15 })).toBe('+15%');
    expect(formatEffect({ kind: 'to', amount: 25 })).toBe('to 25%');
    expect(forecastEffect(62, { kind: 'to', amount: 25 })).toBe(25);
    expect(forecastEffect(10, { kind: 'to', amount: 25 })).toBe(10);
    expect(describeEffectForecast('Brain Energy', 62, { kind: 'to', amount: 25 })).toBe(
      'Usually Brain Energy 62% → ~25%',
    );
    expect(describeEffectForecast('Brain Energy', 20, { kind: 'to', amount: 25 })).toBeUndefined();
  });
});
