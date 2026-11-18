import type { BehaviorEntry } from '../types/behavior';
import type { Cue, SavedPlace } from '../types/cue';
import {
  getReminderNotificationContent,
  isTimedBehavior,
  LOG_ACTION_PREFIX,
  type ReminderNotificationData,
  SNOOZE_ACTION_ID,
  TIMER_ACTION_PREFIX,
} from './reminder-utils';

/** A message-only toast goes away on its own after this long. */
export const TOAST_MESSAGE_MS = 5000;
/** A toast with buttons waits longer, then becomes the normal notification so the reminder isn't lost. */
export const TOAST_ACTIONS_MS = 10000;
/** Extra toasts queue behind the front one. */
export const MAX_QUEUED_TOASTS = 6;

export type ReminderToastPosition = 'top' | 'bottom';
export const DEFAULT_TOAST_POSITION: ReminderToastPosition = 'bottom';

export interface ReminderToastButton {
  /** Same ids the notification buttons use (`timer:<id>`, `log:<id>`, `snooze`). */
  id: string;
  title: string;
  primary: boolean;
}

export interface ReminderToast {
  id: string;
  cueId: string;
  title: string;
  body: string;
  /** First suggested behaviour, whose icon the card shows. */
  behaviorId?: string;
  buttons: ReminderToastButton[];
  durationMs: number;
  data: ReminderNotificationData;
  /** The system notification the toast replaced, shown if the toast times out unanswered. */
  fallback: { title: string; body: string; categoryIdentifier?: string };
  createdAt: number;
}

/** Marks a notification that was re-posted after its toast timed out, so it isn't turned into a toast again. */
export const TOAST_FALLBACK_FLAG = 'fromToast';

/** Toast buttons: Later first, then Log and Start for a timed behaviour, or one button per suggested behaviour. */
export function getToastButtons(suggested: BehaviorEntry[]): ReminderToastButton[] {
  if (suggested.length === 0) return [];
  const later: ReminderToastButton = { id: SNOOZE_ACTION_ID, title: `Later`, primary: false };
  if (suggested.length === 1) {
    const [behavior] = suggested;
    const log: ReminderToastButton = { id: `${LOG_ACTION_PREFIX}${behavior.id}`, title: 'Log', primary: false };
    if (!isTimedBehavior(behavior)) return [later, { ...log, primary: true }];
    return [later, log, { id: `${TIMER_ACTION_PREFIX}${behavior.id}`, title: '▶ Start timer', primary: true }];
  }
  return [
    later,
    ...suggested
      .slice(0, 2)
      .map<ReminderToastButton>(behavior =>
        isTimedBehavior(behavior)
          ? { id: `${TIMER_ACTION_PREFIX}${behavior.id}`, title: `▶ ${behavior.name}`, primary: true }
          : { id: `${LOG_ACTION_PREFIX}${behavior.id}`, title: `Log ${behavior.name}`, primary: true },
      ),
  ];
}

/** Whether a notification arriving while the app is open should be shown as an in-app toast. */
export function shouldShowReminderToast({
  appActive,
  enabled,
  cue,
  data,
}: {
  appActive: boolean;
  enabled: boolean;
  cue: Cue | undefined;
  data: unknown;
}): boolean {
  if (!appActive || !enabled || !cue || cue.trigger.type !== 'habit') return false;
  if (data != null && typeof data === 'object' && (data as Record<string, unknown>)[TOAST_FALLBACK_FLAG]) return false;
  return true;
}

export function buildReminderToast(
  cue: Cue,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
  categoryIdentifier: string | undefined,
  now = Date.now(),
): ReminderToast {
  const { title, body, data } = getReminderNotificationContent(cue, places, behaviors);
  const suggested = data.behaviorIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is BehaviorEntry => behavior != null);
  const buttons = getToastButtons(suggested);
  const lead = suggested[0];
  const hasSuggestion = suggested.length > 0;
  return {
    id: `toast:${cue.id}`,
    cueId: cue.id,
    title: hasSuggestion && suggested.length === 1 ? lead.name : title,
    body: hasSuggestion ? (suggested.length === 1 ? title : body) : body,
    behaviorId: lead?.id,
    buttons,
    durationMs: buttons.length > 0 ? TOAST_ACTIONS_MS : TOAST_MESSAGE_MS,
    data,
    fallback: { title, body, categoryIdentifier },
    createdAt: now,
  };
}

/** Adds a toast to the queue; a repeat of the same reminder replaces its older toast. */
export function enqueueToast(queue: ReminderToast[], toast: ReminderToast): ReminderToast[] {
  const without = queue.filter(item => item.cueId !== toast.cueId);
  return [...without, toast].slice(-MAX_QUEUED_TOASTS);
}

export function removeToast(queue: ReminderToast[], id: string): ReminderToast[] {
  return queue.filter(item => item.id !== id);
}

/** Share (0..1) of the toast's time still left, for the countdown ring. */
export function getToastRemainingShare(remainingMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs / durationMs));
}

export function getToastSecondsLeft(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
