import { AppUsage } from '../../modules/app-usage';
import type { BehaviorEntry } from '../types/behavior';
import type { Cue, SavedPlace } from '../types/cue';
import { buildReminderNotificationContent, REMINDER_CHANNEL_ID } from './reminder-notifications';
import { type AppOpenWatch, getAppOpenReminders } from './reminder-utils';

/** Android builds whose accessibility service can post a suggestion when another app opens. */
export function isAppOpenWatchingAvailable(): boolean {
  return typeof AppUsage?.setAppOpenWatches === 'function';
}

/**
 * Hands the native accessibility service one ready-made notification per "Open <app>" reminder. The service
 * posts it the moment that app comes to the foreground, even with Recupero closed; its buttons (Start timer,
 * Later) run through the same background notification task as every other reminder.
 */
export async function syncAppOpenWatches(cues: Cue[], places: SavedPlace[], behaviors: BehaviorEntry[]): Promise<void> {
  if (!isAppOpenWatchingAvailable()) return;
  const watches: AppOpenWatch[] = [];
  for (const cue of getAppOpenReminders(cues)) {
    if (cue.trigger.type !== 'app') continue;
    const content = await buildReminderNotificationContent(cue, places, behaviors);
    watches.push({
      cueId: cue.id,
      packageName: cue.trigger.packageName,
      title: content.title ?? '',
      body: content.body ?? '',
      data: JSON.stringify(content.data ?? {}),
      categoryIdentifier: content.categoryIdentifier ?? null,
      channelId: REMINDER_CHANNEL_ID,
    });
  }
  AppUsage?.setAppOpenWatches?.(JSON.stringify(watches));
}
