import * as Notifications from 'expo-notifications';
import {
  OUTSIDE_MODE_CATEGORY,
  OUTSIDE_MODE_NOTIFICATION_ID,
  OUTSIDE_MODE_NOTIFICATION_KIND,
  OUTSIDE_MODE_STOP_ACTION_ID,
} from './outside-mode-notification-utils';
import { REMINDER_CHANNEL_ID, setupReminderNotifications } from './reminder-notifications';

let categoryPromise: Promise<unknown> | null = null;

function ensureCategory(): Promise<unknown> {
  if (!categoryPromise) {
    categoryPromise = Notifications.setNotificationCategoryAsync(OUTSIDE_MODE_CATEGORY, [
      { identifier: OUTSIDE_MODE_STOP_ACTION_ID, buttonTitle: '⏹ Stop', options: { opensAppToForeground: false } },
    ]).catch(error => {
      categoryPromise = null;
      throw error;
    });
  }
  return categoryPromise;
}

/** Ongoing "Outside Mode is on" notification with a Stop button that works without opening Recupero. */
export async function presentOutsideModeNotification(): Promise<void> {
  await ensureCategory();
  await setupReminderNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: OUTSIDE_MODE_NOTIFICATION_ID,
    content: {
      title: 'Sunlight: Outside Mode is on',
      body: 'Tap Stop when you are done moving between places.',
      data: { kind: OUTSIDE_MODE_NOTIFICATION_KIND },
      categoryIdentifier: OUTSIDE_MODE_CATEGORY,
      sticky: true,
      autoDismiss: false,
    },
    trigger: process.env.EXPO_OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null,
  });
}

export async function dismissOutsideModeNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(OUTSIDE_MODE_NOTIFICATION_ID).catch(() => undefined);
}
