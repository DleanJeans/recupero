import * as Notifications from 'expo-notifications';
import { useCheckInStore } from '../store/checkin-store';
import { useCuesStore } from '../store/cues-store';
import {
  CHECKIN_ACTION_PREFIX,
  CHECKIN_NOTIFICATION_KIND,
  CHECKIN_NUDGE_ID_PREFIX,
  CHECKIN_NUDGE_MOODS,
  type CheckInNudgePlan,
  getCheckInEvents,
  getCheckInNudgePlans,
  getCheckInStreak,
  getNextCheckInXp,
} from './checkin-utils';
import { getMoodOption } from './cue-utils';
import { iconText } from './icon-utils';
import { hasNotificationPermission, REMINDER_CHANNEL_ID, setupReminderNotifications } from './reminder-notifications';

const CHECKIN_CATEGORY = 'checkin-mood';
const CHECKIN_CONFIRM_ID = 'checkin-confirm';

async function ensureCategory(): Promise<void> {
  const { customMoods } = useCuesStore.getState();
  await Notifications.setNotificationCategoryAsync(
    CHECKIN_CATEGORY,
    CHECKIN_NUDGE_MOODS.map(mood => {
      const option = getMoodOption(mood, customMoods);
      return {
        identifier: `${CHECKIN_ACTION_PREFIX}${mood}`,
        buttonTitle: `${iconText(option.emoji)} ${option.label}`,
        // Logs the mood without opening Recupero (see handleBackgroundNotificationAction).
        options: { opensAppToForeground: false },
      };
    }),
  );
}

/** Replaces every scheduled check-in nudge with `plans`. */
export async function syncCheckInNudges(plans: CheckInNudgePlan[]): Promise<void> {
  await setupReminderNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(request => request.identifier.startsWith(CHECKIN_NUDGE_ID_PREFIX))
      .map(request => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  if (plans.length === 0 || !(await hasNotificationPermission())) return;
  await ensureCategory();
  for (const plan of plans) {
    await Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: plan.title,
        body: plan.body,
        data: { kind: CHECKIN_NOTIFICATION_KIND },
        categoryIdentifier: CHECKIN_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.at),
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

/** Plans nudges from the stored logs and settings. */
export function planCheckInNudges(now = Date.now()): { plans: CheckInNudgePlan[]; signature: string } {
  const { moodLogs, bodyLogs } = useCuesStore.getState();
  const settings = useCheckInStore.getState();
  const events = getCheckInEvents(moodLogs, bodyLogs);
  const plans = getCheckInNudgePlans(settings, events, now);
  return { plans, signature: JSON.stringify(plans) };
}

/** "🙂 Good logged · +5 XP, 🔥 7-day streak" shown after a nudge button logs a mood. */
export async function presentCheckInConfirmation(moodId: string, xp: number): Promise<void> {
  const { moodLogs, bodyLogs, customMoods } = useCuesStore.getState();
  const option = getMoodOption(moodId, customMoods);
  const streak = getCheckInStreak(getCheckInEvents(moodLogs, bodyLogs));
  await setupReminderNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: CHECKIN_CONFIRM_ID,
    content: {
      title: `${iconText(option.emoji)} ${option.label} logged${xp > 0 ? ` · +${xp} XP` : ''}`,
      body: streak.current > 0 ? `🔥 ${streak.current}-day streak. Body too? Tap to add.` : 'Body too? Tap to add.',
      data: { kind: CHECKIN_NOTIFICATION_KIND },
    },
    trigger: process.env.EXPO_OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null,
  });
}

/** XP the next mood log earns right now. */
export function getNextMoodXp(): number {
  const { moodLogs, bodyLogs } = useCuesStore.getState();
  return getNextCheckInXp(getCheckInEvents(moodLogs, bodyLogs), 'mood');
}
