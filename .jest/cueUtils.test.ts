import type { BehaviorEntry } from '../src/types/behavior';
import type { Cue } from '../src/types/cue';
import {
  createDefaultCueTrigger,
  getCueTriggerLabel,
  getMoodSuggestedBehaviorIds,
  isCueTriggerComplete,
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
});
