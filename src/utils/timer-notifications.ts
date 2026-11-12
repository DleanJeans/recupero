import * as Notifications from 'expo-notifications';
import { REMINDER_CHANNEL_ID, setupReminderNotifications } from './reminder-notifications';
import {
  getTimerBusyContent,
  getTimerRunningContent,
  getTimerStoppedContent,
  isTimerNotificationData,
  TIMER_NOTIFICATION_ID,
  TIMER_NOTIFICATION_KIND,
  TIMER_RUNNING_CATEGORY,
  TIMER_STOP_ACTION_ID,
  type TimerNotificationData,
} from './timer-notification-utils';

let categoryPromise: Promise<unknown> | null = null;

function ensureRunningCategory(): Promise<unknown> {
  if (!categoryPromise) {
    categoryPromise = Notifications.setNotificationCategoryAsync(TIMER_RUNNING_CATEGORY, [
      { identifier: TIMER_STOP_ACTION_ID, buttonTitle: '⏹ Stop', options: { opensAppToForeground: false } },
    ]).catch(error => {
      categoryPromise = null;
      throw error;
    });
  }
  return categoryPromise;
}

async function present(
  content: { title: string; body: string },
  data: TimerNotificationData,
  extra: Partial<Notifications.NotificationContentInput> = {},
): Promise<void> {
  await setupReminderNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_NOTIFICATION_ID,
    content: { ...content, data, ...extra },
    trigger: process.env.EXPO_OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null,
  });
}

/** Ongoing "⏱ German, running since 14:02" with a Stop button that works without opening Recupero. */
export async function presentTimerRunningNotification(
  behaviorId: string,
  behaviorName: string,
  startedAt: number,
): Promise<void> {
  await ensureRunningCategory();
  await present(
    getTimerRunningContent(behaviorName, startedAt),
    { kind: TIMER_NOTIFICATION_KIND, state: 'running', behaviorId },
    { categoryIdentifier: TIMER_RUNNING_CATEGORY, sticky: true, autoDismiss: false },
  );
}

export function presentTimerStoppedNotification(
  behaviorId: string,
  behaviorName: string,
  startedAt: number,
  stoppedAt: number,
): Promise<void> {
  return present(getTimerStoppedContent(behaviorName, startedAt, stoppedAt), {
    kind: TIMER_NOTIFICATION_KIND,
    state: 'stopped',
    behaviorId,
  });
}

export function presentTimerBusyNotification(runningName: string, wantedName: string): Promise<void> {
  return present(getTimerBusyContent(runningName, wantedName), { kind: TIMER_NOTIFICATION_KIND, state: 'busy' });
}

/** Removes the ongoing timer notification once the timer stops or resets inside the app. */
export async function dismissRunningTimerNotification(): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  const running = presented.find(
    notification =>
      notification.request.identifier === TIMER_NOTIFICATION_ID &&
      isTimerNotificationData(notification.request.content.data) &&
      notification.request.content.data.state === 'running',
  );
  if (running) await Notifications.dismissNotificationAsync(TIMER_NOTIFICATION_ID);
}
