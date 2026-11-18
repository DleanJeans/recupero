import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useCheckInStore } from '../store/checkin-store';
import { useCuesStore } from '../store/cues-store';
import type { RootStackParamList } from '../types/navigation';
import { planCheckInNudges, syncCheckInNudges } from '../utils/checkin-notifications';
import { isCheckInNotificationData } from '../utils/checkin-utils';

const NAVIGATION_RETRY_MS = 250;
const NAVIGATION_MAX_RETRIES = 20;

/**
 * Schedules the check-in nudges (mood buttons on the notification) and re-plans them whenever a log or a
 * setting changes. Tapping the notification itself opens Cues; the mood buttons are handled in the background
 * (see handleBackgroundNotificationAction).
 */
export function useCheckInNudges(ready: boolean, navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>) {
  const lastSignature = useRef<string | null>(null);
  const handledResponseIds = useRef(new Set<string>());
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!ready) return;
    const sync = () => {
      const { plans, signature } = planCheckInNudges();
      if (signature === lastSignature.current) return;
      lastSignature.current = signature;
      syncCheckInNudges(plans).catch(error => console.warn('Check-in nudge sync failed', error));
    };
    sync();
    const unsubscribeLogs = useCuesStore.subscribe((state, previous) => {
      if (state.moodLogs !== previous.moodLogs || state.bodyLogs !== previous.bodyLogs) sync();
    });
    const unsubscribeSettings = useCheckInStore.subscribe(sync);
    return () => {
      unsubscribeLogs();
      unsubscribeSettings();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !lastResponse) return;
    const { notification, actionIdentifier } = lastResponse;
    if (!isCheckInNotificationData(notification.request.content.data)) return;
    if (actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const responseId = `${notification.request.identifier}:${notification.date}:${actionIdentifier}`;
    if (handledResponseIds.current.has(responseId)) return;
    handledResponseIds.current.add(responseId);

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (!navigationRef.isReady()) {
        if (attempts++ < NAVIGATION_MAX_RETRIES) timer = setTimeout(open, NAVIGATION_RETRY_MS);
        return;
      }
      navigationRef.navigate('Cues');
      Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
    };
    open();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ready, lastResponse, navigationRef]);
}
