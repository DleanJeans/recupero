import { Alert } from 'react-native';
import type { Cue, CueTrigger } from '../types/cue';
import { isSiteTrackingEnabled } from './app-usage-sync';
import { hasBackgroundLocationPermission, requestBackgroundLocationPermission } from './reminder-geofencing';
import { hasNotificationPermission, requestNotificationPermission } from './reminder-notifications';
import { canTriggerFireAutomatically, getActivePushReminders } from './reminder-utils';

export type MissingReminderPermission = 'notifications' | 'location' | 'appWatcher';

const REMINDER_LOCATION_REASON = 'Place reminders need to know when you arrive or leave while Recupero is closed.';

function explainBackgroundLocation(reason = REMINDER_LOCATION_REASON): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Allow location all the time',
      `${reason} On the next screen, choose "Allow all the time".`,
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
  if (automatic.some(trigger => trigger.type === 'app') && !isSiteTrackingEnabled()) missing.push('appWatcher');
  return missing;
}

/** Asks for what a "Go to this location" task needs. Resolves to the permissions still missing afterwards. */
export async function requestPlaceTaskPermissions(): Promise<MissingReminderPermission[]> {
  const missing: MissingReminderPermission[] = [];
  if (!(await hasBackgroundLocationPermission())) {
    const granted =
      (await explainBackgroundLocation(
        'Place tasks tick themselves off when you arrive, even while Recupero is closed.',
      )) && (await requestBackgroundLocationPermission());
    if (!granted) missing.push('location');
  }
  if (!(await requestNotificationPermission())) missing.push('notifications');
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
  if (active.some(cue => cue.trigger.type === 'app') && !isSiteTrackingEnabled()) missing.push('appWatcher');
  return missing;
}
