import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { BehaviorEntry } from '../types/behavior';
import type { Cue, SavedPlace } from '../types/cue';
import {
  getReminderNotificationContent,
  getTimeReminderSchedules,
  isReminderOnCooldown,
  TIME_REMINDER_ID_PREFIX,
} from './reminder-utils';

export const REMINDER_CHANNEL_ID = 'reminders';
const LAST_FIRED_KEY = 'recupero-reminder-last-fired';

let setupPromise: Promise<void> | null = null;

/** Foreground display behaviour and the Android channel. Safe to call many times. */
export function setupReminderNotifications(): Promise<void> {
  if (!setupPromise) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    setupPromise =
      process.env.EXPO_OS === 'android'
        ? Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
            name: 'Reminders',
            description: 'Place, time and habit reminders',
            importance: Notifications.AndroidImportance.HIGH,
          }).then(() => undefined)
        : Promise.resolve();
    setupPromise.catch(() => {
      setupPromise = null;
    });
  }
  return setupPromise;
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

async function buildContent(
  cue: Cue,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
): Promise<Notifications.NotificationContentInput> {
  const { title, body, data, actions } = getReminderNotificationContent(cue, places, behaviors);
  let categoryIdentifier: string | undefined;
  if (actions.length > 0) {
    categoryIdentifier = `reminder-${cue.id}`;
    await Notifications.setNotificationCategoryAsync(
      categoryIdentifier,
      actions.map(action => ({
        identifier: action.id,
        buttonTitle: action.title,
        options: { opensAppToForeground: true },
      })),
    );
  }
  return { title, body, data, categoryIdentifier };
}

async function readLastFired(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(LAST_FIRED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Shows a reminder now, unless the same reminder already fired within the cooldown. */
export async function presentReminderNotification(
  cue: Cue,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
  now = Date.now(),
): Promise<boolean> {
  const lastFired = await readLastFired();
  if (isReminderOnCooldown(lastFired[cue.id], now)) return false;
  await setupReminderNotifications();
  await Notifications.scheduleNotificationAsync({
    content: await buildContent(cue, places, behaviors),
    trigger: process.env.EXPO_OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null,
  });
  await AsyncStorage.setItem(LAST_FIRED_KEY, JSON.stringify({ ...lastFired, [cue.id]: now }));
  return true;
}

/** Schedules a one-off reminder `delayMin` minutes from now (e.g. "20 min after Coffee"). */
export async function scheduleDelayedReminder(
  cue: Cue,
  delayMin: number,
  places: SavedPlace[],
  behaviors: BehaviorEntry[],
): Promise<void> {
  if (delayMin <= 0) {
    await presentReminderNotification(cue, places, behaviors);
    return;
  }
  await setupReminderNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-after:${cue.id}`,
    content: await buildContent(cue, places, behaviors),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(delayMin * 60),
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

/** Replaces every scheduled clock-time reminder with the current set. */
export async function syncTimeReminders(cues: Cue[], places: SavedPlace[], behaviors: BehaviorEntry[]): Promise<void> {
  await setupReminderNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(request => request.identifier.startsWith(TIME_REMINDER_ID_PREFIX))
      .map(request => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );

  const schedules = getTimeReminderSchedules(cues);
  if (schedules.length === 0 || !(await hasNotificationPermission())) return;
  for (const schedule of schedules) {
    const cue = cues.find(item => item.id === schedule.cueId);
    if (!cue) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: schedule.identifier,
      content: await buildContent(cue, places, behaviors),
      trigger:
        schedule.weekday == null
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: schedule.hour,
              minute: schedule.minute,
              channelId: REMINDER_CHANNEL_ID,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: schedule.weekday,
              hour: schedule.hour,
              minute: schedule.minute,
              channelId: REMINDER_CHANNEL_ID,
            },
    });
  }
}
