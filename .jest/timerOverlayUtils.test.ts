import { getRunningOverlayTimers } from '../src/utils/timer-overlay-utils';

const names: Record<string, string> = { a: 'YouTube', b: 'Reading' };

describe('getRunningOverlayTimers', () => {
  it('keeps only timers that are counting', () => {
    const result = getRunningOverlayTimers(
      [
        { lockedBehaviorId: 'a', startTimestamp: 100, stopTimestamp: undefined },
        { lockedBehaviorId: 'b', startTimestamp: 200, stopTimestamp: 300 },
        { lockedBehaviorId: 'a', startTimestamp: undefined, stopTimestamp: undefined },
      ],
      id => names[id],
    );
    expect(result).toEqual([{ name: 'YouTube', start: 100 }]);
  });

  it('skips timers whose behavior is gone', () => {
    expect(
      getRunningOverlayTimers(
        [{ lockedBehaviorId: 'x', startTimestamp: 1, stopTimestamp: undefined }],
        () => undefined,
      ),
    ).toEqual([]);
  });
});
