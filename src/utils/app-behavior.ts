import { AppUsage, type LaunchableApp } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { useSettingsStore } from '../store/settings-store';
import { findAutoTrackedBehavior, getAutoTrackApp } from './app-usage-utils';

interface EnsureAppBehaviorOptions {
  /** Count only time the app plays media. Updates an existing behavior when it differs. */
  mediaOnly?: boolean;
  /** Turn on duration tracking (XP from time spent) on the behavior. Never turns it off. */
  trackDuration?: boolean;
}

/**
 * The behavior that auto-tracks `app`, made if none exists yet. Needs ("Fill from usage") and Tasks both
 * call this, so an app only ever gets one behavior and its time counts once.
 */
export async function ensureAppBehavior(app: LaunchableApp, options: EnsureAppBehaviorOptions = {}): Promise<string> {
  const store = useBehaviorStore.getState();
  const existing = findAutoTrackedBehavior(store.behaviors, { packageName: app.packageName });
  if (existing) {
    const updates: Parameters<typeof store.updateBehavior>[1] = {};
    if (
      options.mediaOnly != null &&
      existing.autoTrackApp &&
      Boolean(existing.autoTrackApp.mediaOnly) !== options.mediaOnly
    )
      updates.autoTrackApp = { ...existing.autoTrackApp, mediaOnly: options.mediaOnly || undefined };
    if (options.trackDuration && !(existing.xpEnabled && existing.durationXpEnabled)) {
      updates.xpEnabled = true;
      updates.durationXpEnabled = true;
    }
    if (Object.keys(updates).length > 0) store.updateBehavior(existing.id, updates);
    return existing.id;
  }

  const iconUri = await AppUsage?.getAppIcon?.(app.packageName).catch(() => null);
  const cutoff = useSettingsStore.getState().dayCutoffHour;
  const baseApp = getAutoTrackApp(app, undefined, cutoff);
  const autoApp = baseApp && options.mediaOnly ? { ...baseApp, mediaOnly: true } : baseApp;
  const trackDuration = options.trackDuration ? (true as const) : undefined;
  useBehaviorStore
    .getState()
    .addBehavior(
      app.label,
      'neutral',
      iconUri ? { uri: iconUri } : undefined,
      0,
      'rest',
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      trackDuration,
      undefined,
      undefined,
      trackDuration,
      undefined,
      undefined,
      autoApp,
    );
  const behaviors = useBehaviorStore.getState().behaviors;
  return behaviors[behaviors.length - 1].id;
}
