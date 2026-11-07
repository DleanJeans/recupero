import type { BehaviorEntry } from '../src/types/behavior';
import type { CravingLog } from '../src/types/craving';
import {
  DEFAULT_RIDE_MS,
  getActiveCraving,
  getCravableBehaviors,
  getCravingAlternatives,
  getCravingOutcomeLabel,
  getCravingWeekStats,
  getPeakUrge,
  getRecentCravings,
  getRideRemainingMs,
  searchAlternativeBehaviors,
} from '../src/utils/craving-utils';

const makeBehavior = (id: string, type: BehaviorEntry['type'], lastTimestamp: number | null = null): BehaviorEntry => ({
  id,
  name: id,
  type,
  lastTimestamp,
  metadata: {},
  logs: [],
  cooldownMinutes: 0,
});

const makeCraving = (id: string, overrides: Partial<CravingLog> = {}): CravingLog => ({
  id,
  behaviorId: 'youtube',
  startedAt: 1_000,
  rideMs: DEFAULT_RIDE_MS,
  ratings: [],
  ...overrides,
});

const youtube = makeBehavior('youtube', 'undesirable', 50);
const walk = makeBehavior('walk', 'desirable', 40);
const breathe = makeBehavior('breathe', 'desirable', 30);
const read = makeBehavior('read', 'neutral', 20);
const behaviors = [youtube, walk, breathe, read];

describe('craving utils', () => {
  it('finds the newest craving that has not ended', () => {
    const cravings = [
      makeCraving('old', { startedAt: 1 }),
      makeCraving('ended', { startedAt: 3, outcome: 'resisted' }),
      makeCraving('new', { startedAt: 2 }),
    ];
    expect(getActiveCraving(cravings)?.id).toBe('new');
    expect(getActiveCraving([makeCraving('done', { outcome: 'gaveIn' })])).toBeUndefined();
  });

  it('counts the ride down and stops at zero', () => {
    const craving = makeCraving('c', { startedAt: 0, rideMs: 600_000 });
    expect(getRideRemainingMs(craving, 60_000)).toBe(540_000);
    expect(getRideRemainingMs(craving, 700_000)).toBe(0);
  });

  it('reports the strongest urge', () => {
    const craving = makeCraving('c', {
      ratings: [
        { ts: 1, level: 3 },
        { ts: 2, level: 5 },
        { ts: 3, level: 2 },
      ],
    });
    expect(getPeakUrge(craving)).toBe(5);
    expect(getPeakUrge(makeCraving('none'))).toBeUndefined();
  });

  it('suggests most-used alternatives first, then picked ones in order', () => {
    const cravings = [
      makeCraving('a', { outcome: 'redirected', redirectBehaviorId: 'walk' }),
      makeCraving('b', { outcome: 'redirected', redirectBehaviorId: 'walk' }),
      makeCraving('c', { outcome: 'redirected', redirectBehaviorId: 'read' }),
      makeCraving('other', { behaviorId: 'snack', outcome: 'redirected', redirectBehaviorId: 'breathe' }),
    ];
    const result = getCravingAlternatives('youtube', behaviors, cravings, { youtube: ['breathe', 'gone', 'read'] });
    expect(result.map(alt => [alt.behavior.id, alt.redirectCount, alt.isPicked])).toEqual([
      ['walk', 2, false],
      ['read', 1, true],
      ['breathe', 0, true],
    ]);
  });

  it('searches behaviours with undesirable ones last, otherwise most recent first', () => {
    expect(searchAlternativeBehaviors('', behaviors, ['walk']).map(b => b.id)).toEqual(['breathe', 'read', 'youtube']);
    expect(searchAlternativeBehaviors('WA', behaviors, []).map(b => b.id)).toEqual(['walk']);
  });

  it('calls doing a craved behaviour giving in only when it is undesirable', () => {
    expect(getCravingOutcomeLabel('gaveIn', 'undesirable')).toBe('Gave in');
    expect(getCravingOutcomeLabel('gaveIn', 'desirable')).toBe('Did it');
    expect(getCravingOutcomeLabel('resisted', 'neutral')).toBe('Rode it out');
  });

  it('lists undesirable and previously craved behaviours, recently craved first', () => {
    const snack = makeBehavior('snack', 'undesirable', 90);
    const cravings = [makeCraving('a', { behaviorId: 'walk', startedAt: 500 })];
    expect(getCravableBehaviors([...behaviors, snack], cravings).map(b => b.id)).toEqual(['walk', 'snack', 'youtube']);
  });

  it('counts beaten cravings, and giving in only for undesirable behaviours', () => {
    const now = 8 * 24 * 60 * 60_000;
    const cravings = [
      makeCraving('old', { startedAt: 0, outcome: 'resisted' }),
      makeCraving('r', { startedAt: now - 1, outcome: 'resisted' }),
      makeCraving('d', { startedAt: now - 2, outcome: 'redirected' }),
      makeCraving('g', { startedAt: now - 3, outcome: 'gaveIn' }),
      makeCraving('open', { startedAt: now - 4 }),
      makeCraving('w', { behaviorId: 'walk', startedAt: now - 5, outcome: 'gaveIn' }),
    ];
    expect(getCravingWeekStats(cravings, behaviors, now)).toEqual({ beaten: 2, gaveIn: 1, didIt: 1 });
    expect(getCravingWeekStats(cravings, behaviors, now, 'walk')).toEqual({ beaten: 0, gaveIn: 0, didIt: 1 });
    expect(getRecentCravings(cravings).map(c => c.id)).toEqual(['r', 'd', 'g', 'w', 'old']);
  });
});
