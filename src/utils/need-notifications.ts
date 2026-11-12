import * as Notifications from 'expo-notifications';
import type { NeedId } from '../types/need';
import { NEED_NUDGE_ID_PREFIX, type NeedNudgePlan } from './need-utils';
import { hasNotificationPermission, REMINDER_CHANNEL_ID, setupReminderNotifications } from './reminder-notifications';

/** Replaces every scheduled need nudge with `plans`. */
export async function syncNeedNudges(plans: NeedNudgePlan[]): Promise<void> {
  await setupReminderNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(request => request.identifier.startsWith(NEED_NUDGE_ID_PREFIX))
      .map(request => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  if (plans.length === 0 || !(await hasNotificationPermission())) return;

  for (const plan of plans) {
    const categoryIdentifier = `need-${plan.needId}`;
    await Notifications.setNotificationCategoryAsync(
      categoryIdentifier,
      plan.actions.map(action => ({
        identifier: action.id,
        buttonTitle: action.title,
        options: { opensAppToForeground: true },
      })),
    );
    await Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: { title: plan.title, body: plan.body, data: plan.data, categoryIdentifier },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.at),
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

/** Removes already-shown need pushes from the tray for needs that have been refilled. */
export async function dismissRefilledNeedNudges(needIds: NeedId[]): Promise<void> {
  if (needIds.length === 0) return;
  const identifiers = new Set(needIds.map(id => `${NEED_NUDGE_ID_PREFIX}${id}`));
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter(notification => identifiers.has(notification.request.identifier))
      .map(notification => Notifications.dismissNotificationAsync(notification.request.identifier)),
  );
}
