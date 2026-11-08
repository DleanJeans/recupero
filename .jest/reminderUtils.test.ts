import type { BehaviorEntry, LogEntry } from '../src/types/behavior';
import type { Cue, CueTrigger, SavedPlace } from '../src/types/cue';
import {
  canTriggerFireAutomatically,
  getNewlyLoggedBehaviors,
  getReminderGeofenceRegions,
  getReminderNotificationContent,
  getRemindersForGeofenceEvent,
  getRemindersForLoggedBehavior,
  getTimeReminderSchedules,
  isReminderNotificationData,
  isReminderOnCooldown,
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
    expect(content.actions).toEqual([]);
    expect(content.data).toEqual({ kind: 'reminder', cueId: 'a', behaviorIds: ['b1'], cueRef: 'place:gym' });
    expect(isReminderNotificationData(content.data)).toBe(true);
  });

  it('adds one action button per behaviour, up to three', () => {
    const c = cue('a', { type: 'habit', behaviorId: 'x' }, { name: 'After lunch', behaviorIds: ['1', '2', '3', '4'] });
    const behaviors = ['1', '2', '3', '4'].map(id => behavior(id, `B${id}`));
    const content = getReminderNotificationContent(c, [], behaviors);
    expect(content.title).toBe('After lunch');
    expect(content.body).toBe('Try B1, B2, B3 or B4.');
    expect(content.actions.map(a => a.id)).toEqual(['log:1', 'log:2', 'log:3']);
  });
});

describe('isReminderOnCooldown', () => {
  it('blocks a repeat within the cooldown window', () => {
    expect(isReminderOnCooldown(undefined, 0)).toBe(false);
    expect(isReminderOnCooldown(0, REMINDER_COOLDOWN_MS - 1)).toBe(true);
    expect(isReminderOnCooldown(0, REMINDER_COOLDOWN_MS)).toBe(false);
  });
});
