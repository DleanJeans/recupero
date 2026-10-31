import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { buildAppSessions, buildSiteSessions, getAppUsageQueryStart } from './app-usage-utils';
import { MS_PER_DAY } from './date-utils';

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

export function isSiteTrackingEnabled(): boolean {
  try {
    return AppUsage?.isSiteTrackingEnabled() ?? false;
  } catch {
    return false;
  }
}

/** Reads Android usage events since the last sync and logs time spent in auto-tracked apps and Firefox sites. */
export function syncAppUsage(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(): Promise<void> {
  if (!AppUsage || !hasAppUsagePermission()) return;
  const behaviors = useBehaviorStore.getState().behaviors;
  const syncedUntils = behaviors.flatMap(b => [b.autoTrackApp?.syncedUntil, b.autoTrackSite?.syncedUntil]);
  const tracked = syncedUntils.filter((value): value is number => value != null);
  if (tracked.length === 0) return;
  const tracksSites = behaviors.some(b => b.autoTrackSite);

  const now = Date.now();
  const start = getAppUsageQueryStart(tracked, now);
  try {
    const events = await AppUsage.queryEvents(start, now);
    const appSessions = buildAppSessions(events);
    // Read marks from a day earlier so the first Firefox session knows which site was open.
    const marks = tracksSites ? await AppUsage.getSiteMarks(start - MS_PER_DAY, now) : [];
    useBehaviorStore.getState().applyAppUsageSessions(appSessions, buildSiteSessions(appSessions, marks), now);
  } catch (error) {
    console.warn('App usage sync failed', error);
  }
}
