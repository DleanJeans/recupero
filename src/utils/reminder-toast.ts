import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useReminderToastStore } from '../store/reminder-toast-store';
import { useSettingsStore } from '../store/settings-store';
import {
  buildReminderToast,
  type ReminderToast,
  shouldShowReminderToast,
  TOAST_FALLBACK_FLAG,
} from './reminder-toast-utils';
import { isReminderNotificationData } from './reminder-utils';

/**
 * Called for every notification that arrives while Recupero is running. A habit reminder that lands while
 * the app is open becomes an in-app toast; returns true when it did, so the system banner is skipped.
 */
export function showToastForNotification(notification: Notifications.Notification): boolean {
  const { data, categoryIdentifier } = notification.request.content;
  if (!isReminderNotificationData(data)) return false;
  const { cues, places } = useCuesStore.getState();
  const cue = cues.find(item => item.id === data.cueId);
  const enabled = useSettingsStore.getState().reminderToastEnabled;
  if (!shouldShowReminderToast({ appActive: AppState.currentState === 'active', enabled, cue, data })) return false;
  if (!cue) return false;
  const { behaviors } = useBehaviorStore.getState();
  useReminderToastStore.getState().push(buildReminderToast(cue, places, behaviors, categoryIdentifier ?? undefined));
  return true;
}

/** A toast with buttons that nobody answered becomes the system notification it replaced, so nothing is lost. */
export async function presentToastFallbackNotification(toast: ReminderToast): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: toast.fallback.title,
      body: toast.fallback.body,
      data: { ...toast.data, [TOAST_FALLBACK_FLAG]: true },
      categoryIdentifier: toast.fallback.categoryIdentifier,
    },
    trigger: process.env.EXPO_OS === 'android' ? { channelId: 'reminders' } : null,
  });
}
