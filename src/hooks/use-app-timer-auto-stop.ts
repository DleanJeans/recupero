import { useEffect } from 'react';
import { AppState } from 'react-native';
import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { type TimerSession, useTimerStore } from '../store/timer-store';
import { getAppClosedAt } from '../utils/app-usage-utils';
import { buildTimerLogMetadata } from '../utils/metadata-link-utils';
import { shouldLogTimerSegment } from '../utils/timer-utils';

const CHECK_EVERY_MS = 30_000;

/** The app a running timer watches: the one it opened, else the app its behavior auto-tracks. */
function watchedApp(session: Pick<TimerSession, 'lockedBehaviorId' | 'appPackage'>): string | undefined {
  if (session.appPackage) return session.appPackage;
  return useBehaviorStore.getState().behaviors.find(b => b.id === session.lockedBehaviorId)?.autoTrackApp?.packageName;
}

let checking = false;

/** Stops every running timer whose app was used and then closed, and logs it up to when the app closed. */
export async function stopTimersForClosedApps(now = Date.now()): Promise<void> {
  if (checking || !AppUsage?.hasPermission()) return;
  const timer = useTimerStore.getState();
  const sessions = [
    ...(timer.lockedBehaviorId
      ? [
          {
            lockedBehaviorId: timer.lockedBehaviorId,
            appPackage: timer.appPackage,
            startTimestamp: timer.startTimestamp,
            stopTimestamp: timer.stopTimestamp,
            initialNotes: timer.initialNotes,
            taskId: timer.taskId,
          },
        ]
      : []),
    ...timer.parked,
  ].filter(session => session.startTimestamp != null && session.stopTimestamp == null);
  const watched = sessions
    .map(session => ({ session, packageName: watchedApp(session) }))
    .filter((entry): entry is typeof entry & { packageName: string } => entry.packageName != null);
  if (watched.length === 0) return;

  checking = true;
  try {
    const since = Math.min(...watched.map(entry => entry.session.startTimestamp ?? now));
    const events = await AppUsage.queryEvents(since, now);
    for (const { session, packageName } of watched) {
      const start = session.startTimestamp ?? now;
      const closedAt = getAppClosedAt(events, packageName, start, now);
      if (closedAt == null) continue;
      const range = useTimerStore.getState().takeRunning(session.lockedBehaviorId, Math.max(closedAt, start));
      if (!range || !shouldLogTimerSegment(range.start, range.end)) continue;
      const { behaviors, categories, logBehavior } = useBehaviorStore.getState();
      const behavior = behaviors.find(candidate => candidate.id === session.lockedBehaviorId);
      if (!behavior) continue;
      logBehavior(
        behavior.id,
        range.start,
        buildTimerLogMetadata(behavior, categories, session.initialNotes, session.taskId),
        range.end,
      );
    }
  } catch (error) {
    console.warn('Timer auto-stop check failed', error);
  } finally {
    checking = false;
  }
}

/**
 * A timer that opened an app (or runs for an app-tracked behavior) stops by itself once that app has been
 * closed for a couple of minutes, and logs the time up to when it closed. Checked every 30 s while the
 * process runs (the timer overlay keeps it alive in the background) and whenever Recupero comes back.
 */
export function useAppTimerAutoStop(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !AppUsage) return;
    stopTimersForClosedApps();
    const interval = setInterval(() => stopTimersForClosedApps(), CHECK_EVERY_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') stopTimersForClosedApps();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled]);
}
