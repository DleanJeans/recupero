import type { BehaviorEntry } from '../src/types/behavior';
import type { Cue } from '../src/types/cue';
import {
  buildReminderToast,
  enqueueToast,
  getToastButtons,
  getToastRemainingShare,
  getToastSecondsLeft,
  MAX_QUEUED_TOASTS,
  removeToast,
  shouldShowReminderToast,
  TOAST_ACTIONS_MS,
  TOAST_FALLBACK_FLAG,
  TOAST_MESSAGE_MS,
} from '../src/utils/reminder-toast-utils';

const behavior = (id: string, overrides: Partial<BehaviorEntry> = {}): BehaviorEntry =>
  ({ id, name: `B ${id}`, icon: '🙂', logs: [], ...overrides }) as unknown as BehaviorEntry;

const habitCue = (id: string, behaviorIds: string[], name?: string): Cue => ({
  id,
  name,
  enabled: true,
  trigger: { type: 'habit', behaviorId: 'egg' },
  behaviorIds,
  notify: { push: true },
});

describe('getToastButtons', () => {
  it('has no buttons without a suggested behaviour', () => {
    expect(getToastButtons([])).toEqual([]);
  });
  it('offers Later, Log and Start timer for one timed behaviour', () => {
    const buttons = getToastButtons([behavior('a', { durationXpEnabled: true })]);
    expect(buttons.map(button => button.id)).toEqual(['snooze', 'log:a', 'timer:a']);
    expect(buttons[2].primary).toBe(true);
  });
  it('offers Later and Log for one untimed behaviour', () => {
    const buttons = getToastButtons([behavior('a')]);
    expect(buttons.map(button => button.id)).toEqual(['snooze', 'log:a']);
    expect(buttons[1].primary).toBe(true);
  });
  it('uses one button per behaviour, at most two, when several are suggested', () => {
    const buttons = getToastButtons([behavior('a'), behavior('b', { durationXpEnabled: true }), behavior('c')]);
    expect(buttons.map(button => button.id)).toEqual(['snooze', 'log:a', 'timer:b']);
  });
});

describe('buildReminderToast', () => {
  it('shows a message-only reminder briefly with no buttons', () => {
    const toast = buildReminderToast(habitCue('c1', [], 'Drink some water'), [], [], undefined, 1000);
    expect(toast.buttons).toEqual([]);
    expect(toast.durationMs).toBe(TOAST_MESSAGE_MS);
    expect(toast.body).toBe('Drink some water');
    expect(toast.createdAt).toBe(1000);
  });
  it('leads with the suggested behaviour and waits longer for buttons', () => {
    const toast = buildReminderToast(habitCue('c1', ['a']), [], [behavior('a')], 'reminder-c1');
    expect(toast.title).toBe('B a');
    expect(toast.behaviorId).toBe('a');
    expect(toast.durationMs).toBe(TOAST_ACTIONS_MS);
    expect(toast.fallback.categoryIdentifier).toBe('reminder-c1');
  });
});

describe('shouldShowReminderToast', () => {
  const cue = habitCue('c1', []);
  const base = { appActive: true, enabled: true, cue, data: {} };
  it('toasts habit reminders while the app is open', () => {
    expect(shouldShowReminderToast(base)).toBe(true);
  });
  it('skips when the app is in the background or the setting is off', () => {
    expect(shouldShowReminderToast({ ...base, appActive: false })).toBe(false);
    expect(shouldShowReminderToast({ ...base, enabled: false })).toBe(false);
  });
  it('leaves other reminder kinds and unknown cues to notifications', () => {
    const place = { ...cue, trigger: { type: 'location', placeId: 'p', direction: 'enter' } } as unknown as Cue;
    expect(shouldShowReminderToast({ ...base, cue: place })).toBe(false);
    expect(shouldShowReminderToast({ ...base, cue: undefined })).toBe(false);
  });
  it('does not toast a notification that already came from a timed-out toast', () => {
    expect(shouldShowReminderToast({ ...base, data: { [TOAST_FALLBACK_FLAG]: true } })).toBe(false);
  });
});

describe('queue', () => {
  const toast = (cueId: string) => buildReminderToast(habitCue(cueId, []), [], [], undefined);
  it('replaces a repeat of the same reminder and caps the queue', () => {
    const queue = enqueueToast(enqueueToast([], toast('a')), toast('a'));
    expect(queue).toHaveLength(1);
    let many = queue;
    for (let i = 0; i < MAX_QUEUED_TOASTS + 3; i++) many = enqueueToast(many, toast(`c${i}`));
    expect(many).toHaveLength(MAX_QUEUED_TOASTS);
  });
  it('removes a toast by id', () => {
    const queue = enqueueToast([], toast('a'));
    expect(removeToast(queue, queue[0].id)).toEqual([]);
  });
});

describe('countdown helpers', () => {
  it('clamps the remaining share and rounds seconds up', () => {
    expect(getToastRemainingShare(2500, 5000)).toBe(0.5);
    expect(getToastRemainingShare(-1, 5000)).toBe(0);
    expect(getToastRemainingShare(10, 0)).toBe(0);
    expect(getToastSecondsLeft(4100)).toBe(5);
    expect(getToastSecondsLeft(0)).toBe(0);
  });
});
