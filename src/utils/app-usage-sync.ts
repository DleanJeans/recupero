import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { buildAppSessions, getAppUsageQueryStart } from './app-usage-utils';

let syncInFlight: Promise<void> | null = null;

export function isAppUsageAvailable(): boolean {
  return AppUsage != null;
}

export function hasAppUsagePermission(): boolean {
  try {
    return AppUsage?.hasPermission() ?? false;
  } catch {
    return false;
  }
}

/** Reads Android usage events since the last sync and logs time spent in auto-tracked apps. */
export function syncAppUsage(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(): Promise<void> {
  if (!AppUsage || !hasAppUsagePermission()) return;
  const tracked = useBehaviorStore.getState().behaviors.flatMap(b => (b.autoTrackApp ? [b.autoTrackApp] : []));
  if (tracked.length === 0) return;

  const now = Date.now();
  const start = getAppUsageQueryStart(
    tracked.map(t => t.syncedUntil),
    now,
  );
  try {
    const events = await AppUsage.queryEvents(start, now);
    useBehaviorStore.getState().applyAppUsageSessions(buildAppSessions(events), now);
  } catch (error) {
    console.warn('App usage sync failed', error);
  }
}
