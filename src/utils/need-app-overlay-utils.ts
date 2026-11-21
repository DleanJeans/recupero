import type { BehaviorEntry } from '../types/behavior';
import type { NeedConfig, NeedId, NeedMetadataSource } from '../types/need';
import { iconText } from './icon-utils';
import { getBehaviorRefill, getDecayPerHour, getSourceForBehavior, NEED_INFO } from './need-utils';

/** The need an app fills, as the native app-open watcher needs it to draw the ring without Recupero running. */
export interface NeedAppOverlayNeed {
  emoji: string;
  label: string;
  /** Level (0-100) at `at`. */
  level: number;
  at: number;
  /** Percentage points lost per hour while not filling. */
  decayPerHour: number;
  /** Minutes of use that take the need from 0 to 100; missing when the app does not fill it by duration. */
  fullMinutes?: number;
}

/** One app whose foreground time helps a need: opening it shows the timer overlay by itself. */
export interface NeedAppOverlayWatch {
  packageName: string;
  name: string;
  icon?: string;
  need: NeedAppOverlayNeed;
}

interface NeedLike {
  id: NeedId;
  config: NeedConfig;
  source?: NeedMetadataSource;
  level?: number;
}

/**
 * Apps (behaviors that track an app) that refill an enabled need. When several needs share an app the
 * lowest one is shown, since that is the one the app helps most right now.
 */
export function getNeedAppOverlayWatches(
  needs: NeedLike[],
  behaviors: BehaviorEntry[],
  now: number,
): NeedAppOverlayWatch[] {
  const byPackage = new Map<string, NeedAppOverlayWatch>();
  for (const need of needs) {
    if (need.level == null || !need.config.enabled) continue;
    for (const behavior of behaviors) {
      const app = behavior.autoTrackApp;
      if (!app || behavior.archivedAt != null) continue;
      const refill = getBehaviorRefill(need.config, behavior, getSourceForBehavior(need.source, behavior));
      if (!refill) continue;
      const existing = byPackage.get(app.packageName);
      if (existing && existing.need.level <= need.level) continue;
      const info = NEED_INFO[need.id];
      byPackage.set(app.packageName, {
        packageName: app.packageName,
        name: behavior.name,
        icon: iconText(behavior.icon) || undefined,
        need: {
          emoji: info.emoji,
          label: info.label,
          level: need.level,
          at: now,
          decayPerHour: getDecayPerHour(need.config),
          ...(refill.mode === 'duration' && refill.fullMinutes > 0 ? { fullMinutes: refill.fullMinutes } : {}),
        },
      });
    }
  }
  return [...byPackage.values()];
}
