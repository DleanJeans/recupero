import type { BehaviorEntry, Category } from '../src/types/behavior';
import type { NeedCheckIn } from '../src/types/need';
import {
  DEFAULT_HUNGER_FULL_KCAL,
  DEFAULT_NEED_CONFIGS,
  formatNextCraving,
  getBehaviorRefill,
  getLineCrossingTime,
  getNeedEvents,
  getNeedIdForBodySensation,
  getNeedLevelTone,
  getNeedMetadataSource,
  getNeedNudgePlans,
  getNeedRefillHistory,
  getRefillBehaviorIds,
  getSleepEnergyScore,
  getSleepQualityFactor,
  getSuggestedRefillIds,
  isNeedNotificationData,
  learnEmptyHours,
  NEED_NOT_YET_ACTION,
  NEED_UNKNOWN_START_LEVEL,
  shiftOutOfQuietHours,
  simulateNeed,
} from '../src/utils/need-utils';

const H = 3_600_000;
const T0 = new Date(2026, 10, 7, 12, 0, 0).getTime();

const makeBehavior = (id: string, logs: BehaviorEntry['logs']): BehaviorEntry => ({
  id,
  name: id,
  type: 'desirable',
  lastTimestamp: null,
  metadata: {},
  logs,
  cooldownMinutes: 0,
});

const food: Category = {
  id: 'food',
  name: 'Food',
  emoji: '🍎',
  metadataFields: [
    { key: 'field_kcal', label: 'Calorie', unit: 'kcal' },
    { key: 'field_protein', label: 'Protein', unit: 'g' },
  ],
};

describe('getNeedMetadataSource', () => {
  it('picks a calorie field for Hunger by default', () => {
    expect(getNeedMetadataSource('hunger', DEFAULT_NEED_CONFIGS.hunger, [food])).toMatchObject({
      fieldKey: 'field_kcal',
      fullAmount: DEFAULT_HUNGER_FULL_KCAL,
    });
  });
  it('respects an explicit choice or off', () => {
    const custom = { fieldKey: 'field_protein', fullAmount: 50 };
    expect(getNeedMetadataSource('hunger', { ...DEFAULT_NEED_CONFIGS.hunger, metadataSource: custom }, [food])).toEqual(
      { ...custom, categoryIds: ['food'] },
    );
    expect(
      getNeedMetadataSource('hunger', { ...DEFAULT_NEED_CONFIGS.hunger, metadataSource: null }, [food]),
    ).toBeUndefined();
  });
  it('has no automatic source for other needs', () => {
    expect(getNeedMetadataSource('thirst', DEFAULT_NEED_CONFIGS.thirst, [food])).toBeUndefined();
  });
});

describe('getNeedEvents + simulateNeed', () => {
  const source = { fieldKey: 'field_kcal', fullAmount: 800 };

  it('is unknown with no events', () => {
    expect(simulateNeed([], 12.5, T0)).toEqual({});
  });

  it('adds kcal as a share of the full amount and decays after', () => {
    const lunch = makeBehavior('lunch', [{ id: 'l1', timestamp: T0, metadata: { field_kcal: 400 } }]);
    const events = getNeedEvents('hunger', DEFAULT_NEED_CONFIGS.hunger, [lunch], [], source, 0);
    expect(events).toMatchObject([{ ts: T0, kind: 'add', amount: 50, behaviorId: 'lunch' }]);
    // Starts unknown at 50, +50 = 100, then 2h at 12.5%/h.
    expect(simulateNeed(events, 12.5, T0 + 2 * H).level).toBeCloseTo(75);
    expect(NEED_UNKNOWN_START_LEVEL).toBe(50);
  });

  it('uses the mapped refill when the log has no metadata', () => {
    const config = { ...DEFAULT_NEED_CONFIGS.hygiene, refills: { shower: { mode: 'set' as const } } };
    const shower = makeBehavior('shower', [{ id: 's1', timestamp: T0 }]);
    const events = getNeedEvents('hygiene', config, [shower], [], undefined, 0);
    expect(simulateNeed(events, 100 / 36, T0 + 18 * H).level).toBeCloseTo(50);
  });

  it('refills by duration at the end of a timed log', () => {
    const config = {
      ...DEFAULT_NEED_CONFIGS.energy,
      refills: { sleep: { mode: 'duration' as const, fullMinutes: 480 } },
    };
    const sleep = makeBehavior('sleep', [{ id: 'z', timestamp: T0, endTimestamp: T0 + 4 * H }]);
    const events = getNeedEvents('energy', config, [sleep], [], undefined, 0);
    expect(events).toMatchObject([{ ts: T0 + 4 * H, kind: 'add', amount: 50, behaviorId: 'sleep' }]);
  });

  it('scales a wearable sleep refill by time asleep and deep + REM share', () => {
    const config = {
      ...DEFAULT_NEED_CONFIGS.energy,
      refills: { sleep: { mode: 'duration' as const, fullMinutes: 480 } },
    };
    const sleep = makeBehavior('sleep', [
      {
        id: 'z',
        timestamp: T0,
        endTimestamp: T0 + 9 * H,
        sleep: { asleepMinutes: 480, deepMinutes: 48, remMinutes: 48, lightMinutes: 384 },
      },
    ]);
    const [event] = getNeedEvents('energy', config, [sleep], [], undefined, 0);
    expect(event).toMatchObject({ ts: T0 + 9 * H, kind: 'add' });
    expect(event.kind === 'add' && event.amount).toBeCloseTo(90);
  });

  it('lets a check-in set the level and ignores other needs and old logs', () => {
    const checkIns: NeedCheckIn[] = [
      { id: 'c1', needId: 'hunger', ts: T0 + H, level: 20, source: 'tap' },
      { id: 'c2', needId: 'thirst', ts: T0 + H, level: 90, source: 'tap' },
    ];
    const old = makeBehavior('old', [{ id: 'o', timestamp: T0 - 10 * H, metadata: { field_kcal: 800 } }]);
    const events = getNeedEvents('hunger', DEFAULT_NEED_CONFIGS.hunger, [old], checkIns, source, T0 - H);
    expect(events).toHaveLength(1);
    const state = simulateNeed(events, 10, T0 + 2 * H);
    expect(state.level).toBeCloseTo(10);
    expect(state.anchor).toEqual({ ts: T0 + H, level: 20 });
    expect(state.lastRefillAt).toBeUndefined();
  });

  it('never goes below 0 or above 100', () => {
    const big = makeBehavior('feast', [{ id: 'f', timestamp: T0, metadata: { field_kcal: 4000 } }]);
    const events = getNeedEvents('hunger', DEFAULT_NEED_CONFIGS.hunger, [big], [], source, 0);
    expect(simulateNeed(events, 12.5, T0).level).toBe(100);
    expect(simulateNeed(events, 12.5, T0 + 20 * H).level).toBe(0);
  });
});

describe('learnEmptyHours', () => {
  it('speeds up when you are hungrier than predicted, capped at 15%', () => {
    // 8h to empty = 12.5%/h. From 100 to 20 in 4h implies 20%/h; 25% of the way = 14.375%/h.
    const next = learnEmptyHours(8, { ts: T0, level: 100 }, { ts: T0 + 4 * H, level: 20 });
    expect(next).toBeCloseTo(100 / 14.375, 1);
    // A huge drop is capped at +15% rate.
    expect(learnEmptyHours(8, { ts: T0, level: 100 }, { ts: T0 + H, level: 0 })).toBeCloseTo(100 / (12.5 * 1.15), 1);
  });
  it('slows down when you feel fuller than predicted', () => {
    expect(learnEmptyHours(8, { ts: T0, level: 100 }, { ts: T0 + 4 * H, level: 90 })).toBeGreaterThan(8);
  });
  it('ignores check-ins right after an event or with nothing to compare', () => {
    expect(learnEmptyHours(8, { ts: T0, level: 100 }, { ts: T0 + 10 * 60_000, level: 0 })).toBe(8);
    expect(learnEmptyHours(8, undefined, { ts: T0, level: 0 })).toBe(8);
  });
});

describe('crossing times and quiet hours', () => {
  it('finds when a line is crossed', () => {
    expect(getLineCrossingTime(40, 10, 30, T0)).toBe(T0 + H);
    expect(getLineCrossingTime(30, 10, 30, T0)).toBeUndefined();
  });
  it('moves times in 23:00–07:00 to 07:00', () => {
    const late = new Date(2026, 10, 7, 23, 30).getTime();
    const early = new Date(2026, 10, 8, 3, 0).getTime();
    const morning = new Date(2026, 10, 8, 7, 0).getTime();
    expect(shiftOutOfQuietHours(late)).toBe(morning);
    expect(shiftOutOfQuietHours(early)).toBe(morning);
    expect(shiftOutOfQuietHours(T0)).toBe(T0);
  });
});

describe('labels', () => {
  const clock = (ts: number) => new Date(ts).toTimeString().slice(0, 5);
  it('describes the next craving', () => {
    const config = DEFAULT_NEED_CONFIGS.hunger;
    expect(formatNextCraving(undefined, config, T0, clock)).toMatch(/No data/);
    expect(formatNextCraving(20, config, T0, clock)).toBe('Low now');
    expect(formatNextCraving(35, config, T0, clock)).toBe('Low in ~24 min');
    expect(formatNextCraving(80, config, T0, clock)).toBe('Low ~16:00');
  });
  it('tones by level', () => {
    expect(getNeedLevelTone(80, 30)).toBe('good');
    expect(getNeedLevelTone(40, 30)).toBe('low');
    expect(getNeedLevelTone(10, 30)).toBe('craving');
  });
  it('maps body sensations to needs', () => {
    expect(getNeedIdForBodySensation('hungry')).toBe('hunger');
    expect(getNeedIdForBodySensation('sleepy')).toBe('energy');
    expect(getNeedIdForBodySensation('pee')).toBeUndefined();
  });
});

describe('getRefillBehaviorIds', () => {
  it('ranks by recent refills and includes mapped ones', () => {
    const source = { fieldKey: 'field_kcal', fullAmount: 800 };
    const config = { ...DEFAULT_NEED_CONFIGS.hunger, refills: { banana: { mode: 'add' as const, amount: 15 } } };
    const behaviors = [
      makeBehavior('banana', []),
      makeBehavior('rice', [
        { id: 'r1', timestamp: T0, metadata: { field_kcal: 300 } },
        { id: 'r2', timestamp: T0 - H, metadata: { field_kcal: 300 } },
      ]),
      makeBehavior('run', [{ id: 'x', timestamp: T0 }]),
    ];
    expect(getRefillBehaviorIds(config, behaviors, source, T0)).toEqual(['rice', 'banana']);
  });
});

describe('getNeedNudgePlans', () => {
  const base = { ...DEFAULT_NEED_CONFIGS.thirst, emptyHours: 10 }; // 10%/h, nudge at 15%
  it('schedules a push for when the nudge line is crossed', () => {
    const plans = getNeedNudgePlans(
      [{ id: 'thirst', config: base, level: 35, lastRefillAt: T0 - H, refills: [{ id: 'water', name: 'Water' }] }],
      T0,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].at).toBe(T0 + 2 * H);
    expect(plans[0].identifier).toBe('need-nudge:thirst');
    expect(plans[0].body).toBe('Last refill 3h ago. Water?');
    expect(plans[0].actions.map(action => action.id)).toEqual(['log:water', NEED_NOT_YET_ACTION]);
    expect(isNeedNotificationData(plans[0].data)).toBe(true);
  });
  it('skips needs already below the line, unknown or turned off', () => {
    const plans = getNeedNudgePlans(
      [
        { id: 'thirst', config: base, level: 10, refills: [] },
        { id: 'hunger', config: DEFAULT_NEED_CONFIGS.hunger, refills: [] },
        { id: 'hygiene', config: { ...DEFAULT_NEED_CONFIGS.hygiene, enabled: false }, level: 90, refills: [] },
      ],
      T0,
    );
    expect(plans).toEqual([]);
  });
  it('waits for the morning instead of nudging at night', () => {
    const plans = getNeedNudgePlans([{ id: 'thirst', config: base, level: 100, refills: [] }], T0);
    // 100% → 15% at 10%/h from 12:00 lands at 20:30, outside quiet hours.
    expect(new Date(plans[0].at).getHours()).toBe(20);
    const late = getNeedNudgePlans([{ id: 'thirst', config: base, level: 75, refills: [] }], T0 + 6 * H);
    // 18:00 + 6h = 00:00 → 07:00 next day.
    expect(new Date(late[0].at).getHours()).toBe(7);
  });
});

describe('getNeedRefillHistory', () => {
  const source = { fieldKey: 'field_kcal', fullAmount: 800 };
  const isToday = (ts: number) => ts >= T0 - 2 * H;
  it("lists today's refills newest first", () => {
    const behaviors = [
      makeBehavior('rice', [
        { id: 'r1', timestamp: T0 - H, metadata: { field_kcal: 400 } },
        { id: 'r0', timestamp: T0 - 30 * H, metadata: { field_kcal: 400 } },
      ]),
      makeBehavior('egg', [{ id: 'e1', timestamp: T0, metadata: { field_kcal: 80 } }]),
    ];
    const history = getNeedRefillHistory(DEFAULT_NEED_CONFIGS.hunger, behaviors, source, isToday);
    expect(history.today).toBe(true);
    expect(history.entries.map(entry => [entry.logId, entry.amountLabel])).toEqual([
      ['e1', '+10%'],
      ['r1', '+50%'],
    ]);
  });
  it('falls back to the last refill from an earlier day', () => {
    const config = { ...DEFAULT_NEED_CONFIGS.hygiene, refills: { shower: { mode: 'set' as const } } };
    const behaviors = [
      makeBehavior('shower', [
        { id: 's1', timestamp: T0 - 50 * H },
        { id: 's2', timestamp: T0 - 26 * H },
      ]),
    ];
    const history = getNeedRefillHistory(config, behaviors, undefined, isToday);
    expect(history).toEqual({
      today: false,
      entries: [{ behaviorId: 'shower', logId: 's2', ts: T0 - 26 * H, amountLabel: 'Full' }],
    });
  });
});

describe('category refills', () => {
  const drinks = { ...makeBehavior('water', [{ id: 'w1', timestamp: T0 }]), categoryId: 'drinks' };
  const juice = { ...makeBehavior('juice', [{ id: 'j1', timestamp: T0 + H }]), categoryId: 'drinks' };
  const config = {
    ...DEFAULT_NEED_CONFIGS.thirst,
    categoryRefills: { drinks: { mode: 'add' as const, amount: 30 } },
    refills: { juice: { mode: 'add' as const, amount: 15 } },
  };
  it('refills from every behaviour in the category, with a behaviour setting winning', () => {
    expect(getBehaviorRefill(config, drinks)).toEqual({ mode: 'add', amount: 30 });
    expect(getBehaviorRefill(config, juice)).toEqual({ mode: 'add', amount: 15 });
    const events = getNeedEvents('thirst', config, [drinks, juice], [], undefined, 0);
    expect(events.map(event => (event.kind === 'add' ? event.amount : null))).toEqual([30, 15]);
  });
  it('stops keyword suggestions once you pick refills yourself', () => {
    const water = makeBehavior('Water', []);
    expect(getSuggestedRefillIds('thirst', DEFAULT_NEED_CONFIGS.thirst, [water])).toEqual(['Water']);
    expect(getSuggestedRefillIds('thirst', config, [water])).toEqual([]);
  });
});

describe('check-in then refill in the same minute', () => {
  it('applies the refill after the check-in even though the log is timestamped earlier', () => {
    const source = { fieldKey: 'field_kcal', fullAmount: 800 };
    const checkIns: NeedCheckIn[] = [{ id: 'c', needId: 'hunger', ts: T0 + 40_000, level: 45, source: 'tap' }];
    // Log form saves to the minute: 12:00:00, though it was logged after the 12:00:40 check-in.
    const meal = makeBehavior('meal', [{ id: 'm', timestamp: T0, metadata: { field_kcal: 400 } }]);
    const events = getNeedEvents('hunger', DEFAULT_NEED_CONFIGS.hunger, [meal], checkIns, source, 0);
    expect(events.map(event => event.kind)).toEqual(['set', 'add']);
    expect(simulateNeed(events, 12.5, T0 + 50_000).level).toBeCloseTo(95, 0);
  });
});

describe('metadata categories', () => {
  it("doesn't give a 0 kcal behaviour in a calorie category the category's fixed refill", () => {
    const config = {
      ...DEFAULT_NEED_CONFIGS.hunger,
      categoryRefills: { food: { mode: 'add' as const, amount: 60 } },
    };
    const source = getNeedMetadataSource('hunger', config, [food]);
    expect(source?.categoryIds).toEqual(['food']);
    const water = {
      ...makeBehavior('water', [{ id: 'w', timestamp: T0, metadata: { field_kcal: 0 } }]),
      categoryId: 'food',
    };
    const rice = {
      ...makeBehavior('rice', [{ id: 'r', timestamp: T0, metadata: { field_kcal: 400 } }]),
      categoryId: 'food',
    };
    const snack = { ...makeBehavior('snack', [{ id: 's', timestamp: T0 }]), categoryId: 'other' };
    const events = getNeedEvents(
      'hunger',
      { ...config, categoryRefills: { ...config.categoryRefills, other: { mode: 'add', amount: 10 } } },
      [water, rice, snack],
      [],
      source,
      0,
    );
    expect(events.map(event => (event.kind === 'add' ? [event.behaviorId, event.amount] : null))).toEqual([
      ['rice', 50],
      ['snack', 10],
    ]);
  });
});

describe('getSleepQualityFactor', () => {
  it('is 1 without stage data', () => {
    expect(getSleepQualityFactor(undefined)).toBe(1);
    expect(getSleepQualityFactor({ asleepMinutes: 420 })).toBe(1);
    expect(getSleepQualityFactor({ asleepMinutes: 0, deepMinutes: 0, remMinutes: 0 })).toBe(1);
  });

  it('maps the deep + REM share onto 0.8 to 1.1, with 40% as a normal night', () => {
    expect(getSleepQualityFactor({ asleepMinutes: 400, deepMinutes: 80, remMinutes: 80 })).toBeCloseTo(1);
    expect(getSleepQualityFactor({ asleepMinutes: 400, deepMinutes: 40, remMinutes: 40 })).toBeCloseTo(0.9);
    expect(getSleepQualityFactor({ asleepMinutes: 400, deepMinutes: 0, remMinutes: 0 })).toBeCloseTo(0.8);
    expect(getSleepQualityFactor({ asleepMinutes: 400, deepMinutes: 120, remMinutes: 120 })).toBeCloseTo(1.1);
    expect(getSleepQualityFactor({ asleepMinutes: 400, deepMinutes: 200, remMinutes: 200 })).toBeCloseTo(1.1);
  });
});

describe('getSleepEnergyScore', () => {
  const refill = { mode: 'duration' as const, fullMinutes: 480 };

  it('shows the working for a wearable sleep with stages', () => {
    const score = getSleepEnergyScore(
      {
        id: 'z',
        timestamp: T0,
        endTimestamp: T0 + 6 * H,
        sleep: { asleepMinutes: 300, deepMinutes: 60, remMinutes: 60, lightMinutes: 180 },
      },
      refill,
    );
    expect(score?.asleepMinutes).toBe(300);
    expect(score?.restorativeShare).toBeCloseTo(0.4);
    expect(score?.factor).toBeCloseTo(1);
    expect(score?.amount).toBeCloseTo(62.5);
  });

  it('uses the log length and no share for a manual log', () => {
    const score = getSleepEnergyScore({ id: 'm', timestamp: T0, endTimestamp: T0 + 2 * H }, refill);
    expect(score).toMatchObject({ asleepMinutes: 120, factor: 1, amount: 25 });
    expect(score?.restorativeShare).toBeUndefined();
  });

  it('is undefined without a duration refill or an end time', () => {
    expect(getSleepEnergyScore({ id: 'a', timestamp: T0, endTimestamp: T0 + H }, { mode: 'set' })).toBeUndefined();
    expect(getSleepEnergyScore({ id: 'b', timestamp: T0 }, refill)).toBeUndefined();
  });
});
