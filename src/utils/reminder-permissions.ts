import { Alert } from 'react-native';
import type { Cue, CueTrigger } from '../types/cue';
import { hasBackgroundLocationPermission, requestBackgroundLocationPermission } from './reminder-geofencing';
import { hasNotificationPermission, requestNotificationPermission } from './reminder-notifications';
import { canTriggerFireAutomatically, getActivePushReminders } from './reminder-utils';

export type MissingReminderPermission = 'notifications' | 'location';

function explainBackgroundLocation(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Allow location all the time',
      'Place reminders need to know when you arrive or leave while Recupero is closed. On the next screen, choose "Allow all the time".',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Asks for whatever this trigger needs to fire. Resolves to the permissions still missing afterwards. */
export async function requestReminderPermissions(triggers: CueTrigger[]): Promise<MissingReminderPermission[]> {
  const automatic = triggers.filter(canTriggerFireAutomatically);
  if (automatic.length === 0) return [];
  const missing: MissingReminderPermission[] = [];
  if (!(await requestNotificationPermission())) missing.push('notifications');
  if (automatic.some(trigger => trigger.type === 'location') && !(await hasBackgroundLocationPermission())) {
    const granted = (await explainBackgroundLocation()) && (await requestBackgroundLocationPermission());
    if (!granted) missing.push('location');
  }
  return missing;
}

/** Permissions the current active reminders need but don't have. Never prompts. */
export async function getMissingReminderPermissions(cues: Cue[]): Promise<MissingReminderPermission[]> {
  const active = getActivePushReminders(cues);
  if (active.length === 0) return [];
  const missing: MissingReminderPermission[] = [];
  if (!(await hasNotificationPermission())) missing.push('notifications');
  if (active.some(cue => cue.trigger.type === 'location') && !(await hasBackgroundLocationPermission())) {
    missing.push('location');
  }
  return missing;
}
