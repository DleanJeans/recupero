import type { BehaviorEntry } from '../src/types/behavior';
import type { Cue } from '../src/types/cue';
import {
  buildCustomCueOption,
  createDefaultCueTrigger,
  getBodySensationOption,
  getBodySuggestedBehaviorIds,
  getCueSources,
  getCueTriggerLabel,
  getCueXpStats,
  getMoodOption,
  getMoodSuggestedBehaviorIds,
  getPlaceEmoji,
  getRecentBodySensation,
  isCueOptionLabelTaken,
  isCueTriggerComplete,
  MOOD_OPTIONS,
} from '../src/utils/cue-utils';

const behavior = {
  id: 'walk',
  name: 'Walk',
  type: 'desirable',
  lastTimestamp: null,
  metadata: {},
  logs: [],
  cooldownMinutes: 0,
} satisfies BehaviorEntry;

describe('cue utils', () => {
  it('describes location triggers with the saved place name', () => {
    expect(
      getCueTriggerLabel(
        { type: 'location', placeId: 'home', direction: 'exit' },
        [{ id: 'home', name: 'Home', lat: 0, lng: 0, radiusM: 150, isHome: true }],
        [],
      ),
    ).toBe('Leave Home');
  });

  it('deduplicates suggestions from enabled matching mood cues', () => {
    const cues: Cue[] = [
      {
        id: 'one',
        enabled: true,
        trigger: { type: 'mood', moods: ['stressed'] },
        behaviorIds: [behavior.id],
        notify: { push: true },
      },
      {
        id: 'two',
        enabled: true,
        trigger: { type: 'time', mode: 'auto', pattern: 'wakeup' },
        conditions: [{ type: 'mood', moods: ['stressed'] }],
        behaviorIds: [behavior.id],
        notify: { push: false },
      },
      {
        id: 'disabled',
        enabled: false,
        trigger: { type: 'mood', moods: ['stressed'] },
        behaviorIds: ['ignored'],
        notify: { push: true },
      },
    ];

    expect(getMoodSuggestedBehaviorIds('stressed', cues)).toEqual(['walk']);
  });

  it('creates valid defaults without inventing required references', () => {
    expect(createDefaultCueTrigger('location')).toEqual({ type: 'location', placeId: '', direction: 'enter' });
    expect(isCueTriggerComplete(createDefaultCueTrigger('location'))).toBe(false);
    expect(isCueTriggerComplete({ type: 'mood', moods: ['good'] })).toBe(true);
  });

  it('describes and matches body sensation triggers', () => {
    expect(getCueTriggerLabel({ type: 'body', sensations: ['pee', 'thirsty'] }, [], [])).toBe(
      'When body says need to pee or thirsty',
    );
    expect(createDefaultCueTrigger('body')).toEqual({ type: 'body', sensations: [] });
    expect(isCueTriggerComplete(createDefaultCueTrigger('body'))).toBe(false);
    expect(isCueTriggerComplete({ type: 'body', sensations: ['sleepy'] })).toBe(true);

    const cues: Cue[] = [
      {
        id: 'nap',
        enabled: true,
        trigger: { type: 'body', sensations: ['sleepy', 'tired'] },
        behaviorIds: [behavior.id],
        notify: { push: false },
      },
      {
        id: 'mood-tired',
        enabled: true,
        trigger: { type: 'mood', moods: ['tired'] },
        behaviorIds: ['mood-only'],
        notify: { push: false },
      },
    ];
    expect(getBodySuggestedBehaviorIds('sleepy', cues)).toEqual(['walk']);
    expect(getBodySuggestedBehaviorIds('hungry', cues)).toEqual([]);
  });

  it('only treats recent body sensations as current', () => {
    const now = 10 * 60 * 60 * 1000;
    const logs = [
      { id: 'old', sensation: 'hungry' as const, ts: now - 3 * 60 * 60 * 1000 },
      { id: 'new', sensation: 'aches' as const, ts: now - 30 * 60 * 1000 },
    ];
    expect(getRecentBodySensation(logs, now)?.id).toBe('new');
    expect(getRecentBodySensation([logs[0]], now)).toBeUndefined();
  });
});

describe('cue XP', () => {
  const place = { id: 'gym', name: 'Gym', lat: 0, lng: 0, radiusM: 100, isHome: false };

  it('lists saved places, then moods, then body sensations', () => {
    const sources = getCueSources([place]);
    expect(sources[0]).toMatchObject({ ref: 'place:gym', kind: 'place', label: 'Gym' });
    expect(sources.filter(source => source.kind === 'mood')).toHaveLength(6);
    expect(sources.filter(source => source.kind === 'body')).toHaveLength(6);
  });

  it("uses a place's own emoji, with no emoji (pin icon) when unset", () => {
    expect(getCueSources([place])[0].emoji).toBeUndefined();
    expect(getCueSources([{ ...place, emoji: '🏋️' }])[0].emoji).toBe('🏋️');
  });

  it('falls back to 🏠 for Home and 📍 otherwise in emoji-only spots', () => {
    expect(getPlaceEmoji({ emoji: '☕', isHome: true })).toBe('☕');
    expect(getPlaceEmoji({ isHome: true })).toBe('🏠');
    expect(getPlaceEmoji({ emoji: '', isHome: false })).toBe('📍');
  });

  it('sums log XP for every cue attached to a log', () => {
    const logged: BehaviorEntry = {
      ...behavior,
      logs: [
        { id: 'a', timestamp: 0, cues: ['place:gym', 'mood:stressed'] },
        { id: 'b', timestamp: 0, endTimestamp: 30 * 60 * 1000, cues: ['place:gym'] },
        { id: 'c', timestamp: 0 },
      ],
    };
    const stats = getCueXpStats([logged]);
    expect(stats.get('place:gym')).toEqual({ xp: 35, logCount: 2 });
    expect(stats.get('mood:stressed')).toEqual({ xp: 5, logCount: 1 });
    expect(stats.get('body:pee')).toBeUndefined();
  });
});

describe('custom moods and body sensations', () => {
  const custom = {
    moods: [{ id: 'm1', emoji: '😬', label: 'Anxious' }],
    sensations: [{ id: 's1', emoji: '🥶', label: 'Cold' }],
  };

  it('lists custom options after the built-in ones', () => {
    const sources = getCueSources([], custom);
    const moods = sources.filter(source => source.kind === 'mood');
    const body = sources.filter(source => source.kind === 'body');
    expect(moods).toHaveLength(7);
    expect(moods[6]).toMatchObject({ ref: 'mood:m1', label: 'Anxious', emoji: '😬' });
    expect(body[6]).toMatchObject({ ref: 'body:s1', label: 'Cold' });
  });

  it('looks up custom options by id and labels reminders with them', () => {
    expect(getMoodOption('m1', custom.moods).label).toBe('Anxious');
    expect(getBodySensationOption('s1', custom.sensations).emoji).toBe('🥶');
    expect(getCueTriggerLabel({ type: 'mood', moods: ['m1', 'low'] }, [], [], custom)).toBe(
      'When feeling Anxious or Low',
    );
    expect(getCueTriggerLabel({ type: 'body', sensations: ['s1'] }, [], [], custom)).toBe('When body says cold');
  });

  it('rejects duplicate labels case-insensitively and falls back to a default emoji', () => {
    expect(isCueOptionLabelTaken(' stressed ', MOOD_OPTIONS)).toBe(true);
    expect(isCueOptionLabelTaken('Anxious', MOOD_OPTIONS)).toBe(false);
    expect(buildCustomCueOption('  Anxious ', ' ', '🙂')).toEqual({ label: 'Anxious', emoji: '🙂' });
  });
});
