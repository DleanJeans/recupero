import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { useTimerStore } from '../store/timer-store';
import type { RootStackParamList } from '../types/navigation';
import { syncAppOpenWatches } from '../utils/app-open-watches';
import { handleBackgroundNotificationAction, isBackgroundNotificationAction } from '../utils/notification-actions';
import { getPlaceTaskGeofenceWatches, PLACE_TASK_NOTIFICATION_KIND } from '../utils/place-task-utils';
import { syncReminderGeofences } from '../utils/reminder-geofencing';
import {
  scheduleDelayedReminder,
  setupReminderNotifications,
  syncTimeReminders,
} from '../utils/reminder-notifications';
import {
  getNewlyLoggedBehaviors,
  getReminderScheduleSignature,
  getRemindersForLoggedBehavior,
  isReminderNotificationData,
  parseReminderAction,
} from '../utils/reminder-utils';
import { getSunlightGeofenceRegions } from '../utils/sunlight-utils';
import { isTimerNotificationData, isTimerRunning } from '../utils/timer-notification-utils';
import { dismissRunningTimerNotification } from '../utils/timer-notifications';

const NAVIGATION_RETRY_MS = 250;
const NAVIGATION_MAX_RETRIES = 20;

/** Places other features want arrive/leave events for, e.g. place tasks. */
function getExtraGeofenceWatches() {
  return getPlaceTaskGeofenceWatches(useBehaviorStore.getState().tasks);
}

/** Sunlight's own small geofences around every indoor place (not floored to 100 m like reminders). */
function getExtraGeofenceRegions() {
  const { places } = useCuesStore.getState();
  const { enabled, outdoorPlaceIds, radiusM } = useSunlightStore.getState();
  return getSunlightGeofenceRegions(enabled, places, outdoorPlaceIds, radiusM);
}

async function syncAll() {
  const { cues, places } = useCuesStore.getState();
  const { behaviors } = useBehaviorStore.getState();
  await Promise.all([
    syncTimeReminders(cues, places, behaviors).catch(error => console.warn('Time reminder sync failed', error)),
    syncReminderGeofences(cues, places, getExtraGeofenceWatches(), getExtraGeofenceRegions()).catch(error =>
      console.warn('Geofence sync failed', error),
    ),
    syncAppOpenWatches(cues, places, behaviors).catch(error => console.warn('App-open reminder sync failed', error)),
  ]);
}

/** Re-sync scheduled reminders and geofences now, e.g. after the user grants a permission. */
export function resyncReminders(): Promise<void> {
  return syncAll();
}

/**
 * Keeps scheduled time reminders and place geofences in sync with the Reminders list,
 * schedules "after behaviour" reminders when a behaviour is logged, and opens the log
 * screen when a reminder notification is tapped.
 */
export function useReminderEngine(
  ready: boolean,
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
) {
  const lastSignature = useRef<string | null>(null);
  const handledResponseIds = useRef(new Set<string>());
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!ready) return;
    setupReminderNotifications().catch(() => undefined);

    const syncIfChanged = () => {
      const { cues, places } = useCuesStore.getState();
      const { behaviors } = useBehaviorStore.getState();
      const signature = getReminderScheduleSignature(
        cues,
        places,
        behaviors,
        getExtraGeofenceWatches(),
        getExtraGeofenceRegions(),
      );
      if (signature === lastSignature.current) return;
      lastSignature.current = signature;
      void syncAll();
    };
    syncIfChanged();

    const unsubscribeCues = useCuesStore.subscribe(syncIfChanged);
    const unsubscribeSunlight = useSunlightStore.subscribe((state, previous) => {
      if (
        state.enabled !== previous.enabled ||
        state.outdoorPlaceIds !== previous.outdoorPlaceIds ||
        state.radiusM !== previous.radiusM
      ) {
        syncIfChanged();
      }
    });
    const unsubscribeBehaviors = useBehaviorStore.subscribe((state, previous) => {
      if (state.tasks !== previous.tasks) syncIfChanged();
      if (state.behaviors === previous.behaviors) return;
      syncIfChanged();
      const { cues, places } = useCuesStore.getState();
      for (const { behaviorId } of getNewlyLoggedBehaviors(previous.behaviors, state.behaviors)) {
        for (const { cue, delayMin } of getRemindersForLoggedBehavior(cues, behaviorId)) {
          scheduleDelayedReminder(cue, delayMin, places, state.behaviors).catch(error =>
            console.warn('Habit reminder failed', error),
          );
        }
      }
    });
    // A timer started from a notification shows an ongoing notification; clear it once the timer stops in the app.
    const unsubscribeTimer = useTimerStore.subscribe((state, previous) => {
      if (isTimerRunning(previous) && !isTimerRunning(state)) {
        dismissRunningTimerNotification().catch(() => undefined);
      }
    });
    return () => {
      unsubscribeCues();
      unsubscribeSunlight();
      unsubscribeBehaviors();
      unsubscribeTimer();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !lastResponse) return;
    const { notification, actionIdentifier } = lastResponse;
    const responseId = `${notification.request.identifier}:${notification.date}:${actionIdentifier}`;
    if (handledResponseIds.current.has(responseId)) return;
    const data = notification.request.content.data;
    if (data?.kind === PLACE_TASK_NOTIFICATION_KIND) {
      handledResponseIds.current.add(responseId);
      if (navigationRef.isReady()) navigationRef.navigate('Tasks');
      Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
      return;
    }
    if (isTimerNotificationData(data) || isBackgroundNotificationAction({ actionIdentifier, data })) {
      handledResponseIds.current.add(responseId);
      if (actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // In the background the notification task already ran this button; only run it here in the foreground.
        if (AppState.currentState === 'active') {
          handleBackgroundNotificationAction({
            actionIdentifier,
            notificationId: notification.request.identifier,
            notificationDate: notification.date,
            data,
          }).catch(error => console.warn('Notification action failed', error));
        }
        return;
      }
      if (navigationRef.isReady()) navigationRef.navigate('Timer');
      return;
    }
    if (!isReminderNotificationData(data)) return;
    handledResponseIds.current.add(responseId);

    const behaviors = useBehaviorStore.getState().behaviors;
    const action = parseReminderAction(actionIdentifier);
    const chosenId = action.kind === 'log' ? action.behaviorId : data.behaviorIds[0];
    const behaviorId = behaviors.some(behavior => behavior.id === chosenId)
      ? chosenId
      : data.behaviorIds.find(id => behaviors.some(behavior => behavior.id === id));

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (!navigationRef.isReady()) {
        if (attempts++ < NAVIGATION_MAX_RETRIES) timer = setTimeout(open, NAVIGATION_RETRY_MS);
        return;
      }
      if (behaviorId) {
        navigationRef.navigate('BehaviorLog', {
          behaviorId,
          initialMode: 'log',
          initialCues: data.cueRef ? [data.cueRef] : undefined,
        });
      } else {
        navigationRef.navigate('Cues');
      }
      Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
    };
    open();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ready, lastResponse, navigationRef]);
}
