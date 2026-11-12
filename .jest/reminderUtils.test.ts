import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import type { Cue, CueTrigger, SavedPlace } from '../src/types/cue';
import {
  canTriggerFireAutomatically,
  getAppOpenReminders,
  getNewlyLoggedBehaviors,
  getReminderGeofenceRegions,
  getReminderNotificationContent,
  getRemindersForGeofenceEvent,
  getRemindersForLoggedBehavior,
  getTimeReminderSchedules,
  isReminderNotificationData,
  isReminderOnCooldown,
  isTimedBehavior,
  parseReminderAction,
  REMINDER_COOLDOWN_MS,
} from '../src/utils/reminder-utils';

const cue = (id: string, trigger: CueTrigger, overrides: Partial<Cue> = {}): Cue => ({
  id,
  enabled: true,
  trigger,
  behaviorIds: ['b1'],
  notify: { push: true },
  ...overrides,
});

const place = (id: string, radiusM: number): SavedPlace => ({
  id,
  name: `Place ${id}`,
  lat: 10,
  lng: 20,
  radiusM,
  isHome: false,
});

const behavior = (id: string, name: string, logs: LogEntry[] = []) => ({ id, name, logs }) as unknown as BehaviorEntry;

describe('canTriggerFireAutomatically', () => {
  it('fires place, clock time, habit and after-behaviour triggers only', () => {
    expect(canTriggerFireAutomatically({ type: 'location', placeId: 'p', direction: 'enter' })).toBe(true);
    expect(canTriggerFireAutomatically({ type: 'time', mode: 'simple', at: '08:00', repeatDays: [1] })).toBe(true);
    expect(canTriggerFireAutomatically({ type: 'habit', behaviorId: 'b' })).toBe(true);
    expect(
      canTriggerFireAutomatically({
        type: 'time',
        mode: 'auto',
        pattern: 'afterBehavior',
        behaviorId: 'b',
        delayMin: 5,
      }),
    ).toBe(true);
    expect(canTriggerFireAutomatically({ type: 'time', mode: 'auto', pattern: 'wakeup' })).toBe(false);
    expect(canTriggerFireAutomatically({ type: 'mood', moods: ['low'] })).toBe(false);
    expect(canTriggerFireAutomatically({ type: 'body', sensations: ['thirsty'] })).toBe(false);
  });
});

describe('getTimeReminderSchedules', () => {
  it('uses one daily trigger when every day is selected', () => {
    const schedules = getTimeReminderSchedules([
      cue('c', { type: 'time', mode: 'simple', at: '07:30', repeatDays: [0, 1, 2, 3, 4, 5, 6] }),
    ]);
    expect(schedules).toEqual([
      { identifier: 'reminder-time:c:daily', cueId: 'c', weekday: null, hour: 7, minute: 30 },
    ]);
  });

  it('maps Sunday-first days to expo weekdays (1 = Sunday)', () => {
    const schedules = getTimeReminderSchedules([
      cue('c', { type: 'time', mode: 'simple', at: '21:05', repeatDays: [6, 1] }),
    ]);
    expect(schedules.map(s => s.weekday)).toEqual([2, 7]);
    expect(schedules[0]).toMatchObject({ hour: 21, minute: 5 });
  });

  it('skips disabled, push-off and behaviour-less reminders', () => {
    const trigger: CueTrigger = { type: 'time', mode: 'simple', at: '08:00', repeatDays: [1] };
    expect(
      getTimeReminderSchedules([
        cue('a', trigger, { enabled: false }),
        cue('b', trigger, { notify: { push: false } }),
        cue('c', trigger, { behaviorIds: [] }),
      ]),
    ).toEqual([]);
  });
});

describe('getReminderGeofenceRegions', () => {
  it('registers only referenced places, at least 100 m, with the directions in use', () => {
    const cues = [
      cue('a', { type: 'location', placeId: 'gym', direction: 'enter' }),
      cue('b', { type: 'location', placeId: 'gym', direction: 'exit' }),
      cue('c', { type: 'location', placeId: 'park', direction: 'exit' }),
    ];
    const regions = getReminderGeofenceRegions(cues, [place('gym', 20), place('park', 250), place('home', 50)]);
    expect(regions).toEqual([
      { identifier: 'gym', latitude: 10, longitude: 20, radius: 100, notifyOnEnter: true, notifyOnExit: true },
      { identifier: 'park', latitude: 10, longitude: 20, radius: 250, notifyOnEnter: false, notifyOnExit: true },
    ]);
  });

  it('merges extra watches (e.g. place tasks) with reminder directions', () => {
    const cues = [cue('a', { type: 'location', placeId: 'gym', direction: 'exit' })];
    const regions = getReminderGeofenceRegions(
      cues,
      [place('gym', 20), place('bank', 150), place('home', 50)],
      [
        { placeId: 'gym', enter: true },
        { placeId: 'bank', enter: true },
        { placeId: 'gone', enter: true },
      ],
    );
    expect(regions).toEqual([
      { identifier: 'gym', latitude: 10, longitude: 20, radius: 100, notifyOnEnter: true, notifyOnExit: true },
      { identifier: 'bank', latitude: 10, longitude: 20, radius: 150, notifyOnEnter: true, notifyOnExit: false },
    ]);
  });

  it('matches geofence events by place and direction', () => {
    const cues = [
      cue('a', { type: 'location', placeId: 'gym', direction: 'enter' }),
      cue('b', { type: 'location', placeId: 'gym', direction: 'exit' }),
    ];
    expect(getRemindersForGeofenceEvent(cues, 'gym', 'exit').map(c => c.id)).toEqual(['b']);
  });
});

describe('getRemindersForLoggedBehavior', () => {
  it('returns habit and after-behaviour reminders with their delays', () => {
    const cues = [
      cue('a', { type: 'habit', behaviorId: 'coffee' }),
      cue('b', { type: 'time', mode: 'auto', pattern: 'afterBehavior', behaviorId: 'coffee', delayMin: 20 }),
      cue('c', { type: 'habit', behaviorId: 'tea', delayMin: 5 }),
    ];
    expect(getRemindersForLoggedBehavior(cues, 'coffee').map(({ cue: c, delayMin }) => [c.id, delayMin])).toEqual([
      ['a', 0],
      ['b', 20],
    ]);
  });
});

describe('getNewlyLoggedBehaviors', () => {
  const now = 1_000_000_000;
  it('finds fresh manual logs only', () => {
    const old = { id: 'old', timestamp: now - 1000 };
    const previous = [behavior('b1', 'Water', [old])];
    const next = [
      behavior('b1', 'Water', [
        old,
        { id: 'new', timestamp: now - 1000 },
        { id: 'backdated', timestamp: now - 2 * 60 * 60 * 1000 },
        { id: 'tracked', timestamp: now, source: 'app-usage' },
      ]),
    ];
    expect(getNewlyLoggedBehaviors(previous, next, now).map(item => item.log.id)).toEqual(['new']);
  });
});

describe('notification content', () => {
  it('names the suggested behaviour and tags the place cue', () => {
    const c = cue('a', { type: 'location', placeId: 'gym', direction: 'enter' }, { behaviorIds: ['b1', 'gone'] });
    const content = getReminderNotificationContent(c, [place('gym', 20)], [behavior('b1', 'Stretch')]);
    expect(content.title).toBe('Enter Place gym');
    expect(content.body).toBe('Time for Stretch? Tap to log it.');
    expect(content.actions).toEqual([
      { id: 'log:b1', title: 'Log', opensApp: true },
      { id: 'snooze', title: 'Later (30 min)', opensApp: false },
    ]);
    expect(content.data).toEqual({ kind: 'reminder', cueId: 'a', behaviorIds: ['b1'], cueRef: 'place:gym' });
    expect(isReminderNotificationData(content.data)).toBe(true);
  });

  it('adds one button per behaviour, up to two, then Later', () => {
    const c = cue('a', { type: 'habit', behaviorId: 'x' }, { name: 'After lunch', behaviorIds: ['1', '2', '3', '4'] });
    const behaviors = ['1', '2', '3', '4'].map(id => behavior(id, `B${id}`));
    const content = getReminderNotificationContent(c, [], behaviors);
    expect(content.title).toBe('After lunch');
    expect(content.body).toBe('Try B1, B2, B3 or B4.');
    expect(content.actions.map(a => a.id)).toEqual(['log:1', 'log:2', 'snooze']);
  });

  it('offers a background Start timer for timed behaviours', () => {
    const c = cue(
      'a',
      { type: 'app', packageName: 'com.lyricsionary', appLabel: 'Lyricsionary' },
      { behaviorIds: ['de'] },
    );
    const german = behavior('de', 'German', [{ id: 'l', timestamp: 1000, endTimestamp: 61_000 }]);
    const content = getReminderNotificationContent(c, [], [german]);
    expect(content.title).toBe('Open Lyricsionary');
    expect(content.actions[0]).toEqual({ id: 'timer:de', title: '▶ Start timer', opensApp: false });
    expect(content.data.cueRef).toBeUndefined();
  });

  it('leaves archived behaviours out', () => {
    const archived = { ...behavior('b1', 'Old'), archivedAt: 1 } as BehaviorEntry;
    const content = getReminderNotificationContent(cue('a', { type: 'habit', behaviorId: 'x' }), [], [archived]);
    expect(content.data.behaviorIds).toEqual([]);
    expect(content.actions).toEqual([]);
  });
});

describe('isTimedBehavior', () => {
  it('is timed with duration XP, auto-tracking or a recent timed log', () => {
    expect(isTimedBehavior(behavior('a', 'A'))).toBe(false);
    expect(isTimedBehavior({ ...behavior('a', 'A'), durationXpEnabled: true } as BehaviorEntry)).toBe(true);
    expect(isTimedBehavior(behavior('a', 'A', [{ id: '1', timestamp: 5, endTimestamp: 5 }]))).toBe(false);
    expect(isTimedBehavior(behavior('a', 'A', [{ id: '1', timestamp: 5, endTimestamp: 90 }]))).toBe(true);
  });
});

describe('parseReminderAction', () => {
  it('reads timer, log, snooze and the default tap', () => {
    expect(parseReminderAction('timer:x')).toEqual({ kind: 'timer', behaviorId: 'x' });
    expect(parseReminderAction('log:y')).toEqual({ kind: 'log', behaviorId: 'y' });
    expect(parseReminderAction('snooze')).toEqual({ kind: 'snooze' });
    expect(parseReminderAction('expo.modules.notifications.actions.DEFAULT')).toEqual({ kind: 'open' });
  });
});

describe('getAppOpenReminders', () => {
  it('keeps active app reminders that picked an app', () => {
    const cues = [
      cue('a', { type: 'app', packageName: 'com.x', appLabel: 'X' }),
      cue('b', { type: 'app', packageName: '', appLabel: '' }),
      cue('c', { type: 'app', packageName: 'com.y', appLabel: 'Y' }, { enabled: false }),
      cue('d', { type: 'location', placeId: 'p', direction: 'enter' }),
    ];
    expect(getAppOpenReminders(cues).map(item => item.id)).toEqual(['a']);
  });
});

describe('isReminderOnCooldown', () => {
  it('blocks a repeat within the cooldown window', () => {
    expect(isReminderOnCooldown(undefined, 0)).toBe(false);
    expect(isReminderOnCooldown(0, REMINDER_COOLDOWN_MS - 1)).toBe(true);
    expect(isReminderOnCooldown(0, REMINDER_COOLDOWN_MS)).toBe(false);
  });
});
