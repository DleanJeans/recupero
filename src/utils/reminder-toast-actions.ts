import { handleBackgroundNotificationAction } from './notification-actions';
import type { ReminderToast } from './reminder-toast-utils';

/**
 * Runs a toast button that doesn't open a screen (Later, Start timer) through the same handler the
 * notification buttons use, so the two always behave alike.
 */
export function runToastButton(toast: ReminderToast, buttonId: string): Promise<void> {
  return handleBackgroundNotificationAction({
    actionIdentifier: buttonId,
    notificationId: toast.id,
    notificationDate: toast.createdAt,
    data: toast.data,
  });
}
