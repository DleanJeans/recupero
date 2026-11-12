import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useTimerStore } from '../store/timer-store';
import { type NotificationActionInput, readTaskNotificationAction } from './notification-action-utils';
import { snoozeReminder } from './reminder-notifications';
import { isReminderNotificationData, parseReminderAction } from './reminder-utils';
import { waitForHydration } from './store-hydration';
import {
  getTimerStartDecision,
  isTimerNotificationData,
  isTimerRunning,
  TIMER_STOP_ACTION_ID,
} from './timer-notification-utils';
import {
  presentTimerBusyNotification,
  presentTimerRunningNotification,
  presentTimerStoppedNotification,
} from './timer-notifications';

export const NOTIFICATION_ACTION_TASK = 'recupero-notification-actions';

const HANDLED_KEY = 'recupero-notification-actions-handled';
const HANDLED_LIMIT = 30;

/**
 * One tap can reach us twice: the background task runs it, and Android replays it to the app's listener the next
 * time Recupero opens. Remember recent taps so the replay doesn't snooze again or restart a finished timer.
 */
async function claimTap(key: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(HANDLED_KEY);
    const handled = raw ? (JSON.parse(raw) as string[]) : [];
    if (handled.includes(key)) return false;
    await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...handled, key].slice(-HANDLED_LIMIT)));
  } catch {
    // Storage trouble shouldn't swallow the tap.
  }
  return true;
}

/** Whether this button is handled without opening Recupero (see handleBackgroundNotificationAction). */
export function isBackgroundNotificationAction({
  actionIdentifier,
  data,
}: Omit<NotificationActionInput, 'notificationId'>) {
  if (isTimerNotificationData(data)) return actionIdentifier === TIMER_STOP_ACTION_ID;
  if (!isReminderNotificationData(data)) return false;
  const action = parseReminderAction(actionIdentifier);
  return action.kind === 'timer' || action.kind === 'snooze';
}

function behaviorName(behaviorId: string | undefined): string {
  return useBehaviorStore.getState().behaviors.find(behavior => behavior.id === behaviorId)?.name ?? 'Timer';
}

async function startTimer(behaviorId: string, now: number): Promise<void> {
  const timer = useTimerStore.getState();
  const decision = getTimerStartDecision(timer, behaviorId);
  if (decision === 'busy') {
    await presentTimerBusyNotification(behaviorName(timer.lockedBehaviorId), behaviorName(behaviorId));
    return;
  }
  if (decision === 'start') timer.start(behaviorId, now);
  const startedAt = useTimerStore.getState().startTimestamp ?? now;
  await presentTimerRunningNotification(behaviorId, behaviorName(behaviorId), startedAt);
}

async function stopTimer(now: number): Promise<void> {
  const timer = useTimerStore.getState();
  if (!isTimerRunning(timer) || timer.startTimestamp == null || !timer.lockedBehaviorId) return;
  // Show "stopped" before updating the store, so the in-app listener that clears a *running* notification leaves it.
  await presentTimerStoppedNotification(
    timer.lockedBehaviorId,
    behaviorName(timer.lockedBehaviorId),
    timer.startTimestamp,
    now,
  );
  useTimerStore.getState().setStop(now);
}

/**
 * Runs a notification button that doesn't open Recupero: start a suggested behaviour's timer, snooze a
 * suggestion, or stop the timer. Safe to run twice for one tap (the background task and an in-app listener
 * can both see it): starting the same timer again and re-snoozing are no-ops.
 */
export async function handleBackgroundNotificationAction(
  { actionIdentifier, notificationId, notificationDate, data }: NotificationActionInput,
  now = Date.now(),
): Promise<void> {
  if (!isBackgroundNotificationAction({ actionIdentifier, data })) return;
  if (!(await claimTap(`${notificationId}:${notificationDate ?? ''}:${actionIdentifier}`))) return;
  await Promise.all([waitForHydration(useBehaviorStore), waitForHydration(useTimerStore)]);

  if (isTimerNotificationData(data)) {
    await stopTimer(now);
    return;
  }
  if (!isReminderNotificationData(data)) return;
  const action = parseReminderAction(actionIdentifier);
  if (action.kind === 'timer') {
    await Notifications.dismissNotificationAsync(notificationId).catch(() => undefined);
    await startTimer(action.behaviorId, now);
  } else if (action.kind === 'snooze') {
    await waitForHydration(useCuesStore);
    await Notifications.dismissNotificationAsync(notificationId).catch(() => undefined);
    const { cues, places } = useCuesStore.getState();
    const cue = cues.find(item => item.id === data.cueId);
    if (cue) await snoozeReminder(cue, places, useBehaviorStore.getState().behaviors);
  }
}

// Must be defined at module load (imported from index.ts): Android runs it headless when a button that doesn't
// open the app is tapped while Recupero is in the background or closed.
TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data, error }) => {
  if (error) return;
  const action = readTaskNotificationAction(data);
  if (!action) return;
  try {
    await handleBackgroundNotificationAction(action);
  } catch (taskError) {
    console.warn('Notification action failed', taskError);
  }
});

Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK).catch(error =>
  console.warn('Notification action task registration failed', error),
);
