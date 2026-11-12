import { readTaskNotificationAction } from '../src/utils/notification-action-utils';
import {
  formatElapsed,
  getTimerStartDecision,
  getTimerStoppedContent,
  isTimerRunning,
} from '../src/utils/timer-notification-utils';

const idle = { lockedBehaviorId: undefined, startTimestamp: undefined, stopTimestamp: undefined };

describe('getTimerStartDecision', () => {
  it('starts when nothing runs, even over a stopped unlogged timer', () => {
    expect(getTimerStartDecision(idle, 'de')).toBe('start');
    expect(getTimerStartDecision({ lockedBehaviorId: 'fr', startTimestamp: 1, stopTimestamp: 2 }, 'de')).toBe('start');
  });

  it('keeps a running timer', () => {
    const running = { lockedBehaviorId: 'fr', startTimestamp: 1, stopTimestamp: undefined };
    expect(isTimerRunning(running)).toBe(true);
    expect(getTimerStartDecision(running, 'fr')).toBe('already-running');
    expect(getTimerStartDecision(running, 'de')).toBe('busy');
  });
});

describe('timer notification copy', () => {
  it('formats elapsed time', () => {
    expect(formatElapsed(25 * 60_000)).toBe('25 min');
    expect(formatElapsed(60 * 60_000)).toBe('1 h');
    expect(formatElapsed(95 * 60_000)).toBe('1 h 35 min');
    expect(getTimerStoppedContent('German', 0, 25 * 60_000).title).toBe('⏹ German: 25 min');
  });
});

describe('readTaskNotificationAction', () => {
  it('reads a local notification response with its data as a JSON string', () => {
    const payload = {
      actionIdentifier: 'timer:de',
      notification: {
        date: 123,
        request: { identifier: 'n1', content: { dataString: '{"kind":"reminder","cueId":"c","behaviorIds":["de"]}' } },
      },
    };
    expect(readTaskNotificationAction(payload)).toEqual({
      actionIdentifier: 'timer:de',
      notificationId: 'n1',
      notificationDate: 123,
      data: { kind: 'reminder', cueId: 'c', behaviorIds: ['de'] },
    });
  });

  it('reads data given as an object and ignores non-responses', () => {
    const payload = {
      actionIdentifier: 'snooze',
      notification: { request: { identifier: 'n', content: { data: { a: 1 } } } },
    };
    expect(readTaskNotificationAction(payload)?.data).toEqual({ a: 1 });
    expect(readTaskNotificationAction({ data: { dataString: '{}' } })).toBeNull();
    expect(readTaskNotificationAction(null)).toBeNull();
  });
});
