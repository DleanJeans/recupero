import { AppUsage } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { useNeedsStore } from '../store/needs-store';
import { useSettingsStore } from '../store/settings-store';
import {
  buildAppSessions,
  buildMediaSessions,
  buildSiteSessions,
  fetchSiteName,
  getAppUsageQueryStart,
  getSiteFaviconUri,
} from './app-usage-utils';
import { MS_PER_DAY } from './date-utils';

const PLACEHOLDER_ICON = '⏱️';

let syncInFlight: Promise<void> | null = null;

export function isAppUsageAvailable(): boolean {
  return AppUsage != null;
}

export function isMediaWatchEnabled(): boolean {
  try {
    return AppUsage?.isMediaWatchEnabled?.() ?? false;
  } catch {
    return false;
  }
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

/** Gives tracked apps and sites that have no icon yet the app's icon or the site's favicon. */
async function fillTrackedIcons(): Promise<void> {
  const store = useBehaviorStore.getState();
  let launchable: { packageName: string; label: string }[] | null = null;
  for (const behavior of store.behaviors) {
    // A site still named by its bare domain gets the site's friendly name ("reddit.com" -> "Reddit").
    try {
      if (behavior.autoTrackSite && behavior.archivedAt == null && behavior.name === behavior.autoTrackSite.domain) {
        const name = await fetchSiteName(behavior.autoTrackSite.domain);
        if (name && name !== behavior.name) store.updateBehavior(behavior.id, { name });
      }
      // The stopwatch is the placeholder older builds saved when the app's icon could not be read yet.
      const hasRealIcon = Boolean(behavior.icon) && behavior.icon !== PLACEHOLDER_ICON;
      if (hasRealIcon || behavior.archivedAt != null) continue;
      let uri: string | null | undefined;
      if (behavior.autoTrackSite) uri = getSiteFaviconUri(behavior.autoTrackSite.domain);
      else if (behavior.autoTrackApp)
        uri = await AppUsage?.getAppIcon?.(behavior.autoTrackApp.packageName).catch(() => null);
      else {
        // Not tracked, but named exactly like an installed app ("YouTube"): use that app's icon.
        launchable ??= (await AppUsage?.getLaunchableApps?.().catch(() => null)) ?? [];
        const wanted = behavior.name.trim().toLowerCase();
        const match = wanted ? launchable.find(app => app.label.trim().toLowerCase() === wanted) : undefined;
        if (match) uri = await AppUsage?.getAppIcon?.(match.packageName).catch(() => null);
      }
      if (uri) store.updateBehavior(behavior.id, { icon: { uri } });
    } catch (error) {
      // One failing behaviour must not stop the others (or the usage sync) from getting their icon.
      console.warn('Tracked icon fill failed', error);
    }
  }
}

async function runSync(): Promise<void> {
  // Without usage access the foreground query is empty, but media listening (notification access) still works.
  if (!AppUsage) return;
  await fillTrackedIcons();
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
    const tracksMedia = behaviors.some(b => b.autoTrackApp?.mediaOnly);
    const mediaEvents = tracksMedia ? ((await AppUsage.getMediaEvents?.(start - MS_PER_DAY, now)) ?? []) : [];
    useBehaviorStore
      .getState()
      .applyAppUsageSessions(appSessions, buildSiteSessions(appSessions, marks), now, buildMediaSessions(mediaEvents));
  } catch (error) {
    console.warn('App usage sync failed', error);
  }
}

/** Joins existing back-to-back app/site logs closer than the merge gap. Safe to repeat; skips logs with a manual need amount. */
export function cleanUpSmallAppUsageLogs(): void {
  const protectedIds = new Set<string>();
  for (const need of Object.values(useNeedsStore.getState().needs)) {
    for (const logId of Object.keys(need.logAmounts ?? {})) protectedIds.add(logId);
  }
  const gapMs = useSettingsStore.getState().appLogMergeGapMin * 60_000;
  useBehaviorStore.getState().mergeCloseAppUsageLogs(gapMs, protectedIds);
}
