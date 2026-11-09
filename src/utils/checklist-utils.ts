import type { BehaviorEntry, MetadataField } from '../types/behavior';
import type { Checklist, ChecklistItem, ChecklistItemInput, ChecklistRun } from '../types/checklist';
import { isArchived } from './archive-utils';
import { describeDay, toDateString } from './date-utils';
import {
  buildLogMetadata,
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getInitialLogMetadataValues,
} from './metadata-calculation-utils';

export const CHECKLIST_DEFAULT_EMOJI = '✅';

/** The run if it belongs to `today`, otherwise undefined (checklists start fresh each day). */
export function getTodayRun(run: ChecklistRun | undefined, today: string): ChecklistRun | undefined {
  return run && run.date === today ? run : undefined;
}

/** Items shown when running a checklist: behaviour items whose behaviour was deleted or archived drop out. */
export function getRunnableItems(checklist: Checklist, behaviors: BehaviorEntry[]): ChecklistItem[] {
  return checklist.items.filter(item => {
    if (item.kind === 'plain') return true;
    const behavior = behaviors.find(candidate => candidate.id === item.behaviorId);
    return behavior != null && !isArchived(behavior);
  });
}

/** Drops ticks whose log has since been deleted (e.g. from the behaviour's log list), so the item shows as open again. */
export function pruneRun(run: ChecklistRun | undefined, behaviors: BehaviorEntry[]): ChecklistRun | undefined {
  if (!run) return run;
  let changed = false;
  const ticks: ChecklistRun['ticks'] = {};
  for (const [itemId, tick] of Object.entries(run.ticks)) {
    if (tick.logId && tick.behaviorId) {
      const behavior = behaviors.find(candidate => candidate.id === tick.behaviorId);
      if (!behavior?.logs.some(log => log.id === tick.logId)) {
        changed = true;
        continue;
      }
    }
    ticks[itemId] = tick;
  }
  return changed ? { ...run, ticks, finishedAt: undefined } : run;
}

export interface ChecklistProgress {
  /** Items ticked (not skipped). */
  done: number;
  skipped: number;
  total: number;
  /** Every item is ticked or skipped. */
  complete: boolean;
}

export function getChecklistProgress(items: ChecklistItem[], run: ChecklistRun | undefined): ChecklistProgress {
  let done = 0;
  let skipped = 0;
  for (const item of items) {
    const tick = run?.ticks[item.id];
    if (!tick) continue;
    if (tick.skipped) skipped += 1;
    else done += 1;
  }
  return { done, skipped, total: items.length, complete: items.length > 0 && done + skipped >= items.length };
}

/** Short status for a checklist card: "Done today", "2 of 4", "Done yesterday", or "4 items". */
export function describeChecklistStatus(
  checklist: Checklist,
  todayRun: ChecklistRun | undefined,
  progress: ChecklistProgress,
  dayCutoffHour: number,
): string {
  if (todayRun && (todayRun.finishedAt != null || progress.complete)) return 'Done today';
  if (progress.done + progress.skipped > 0) return `${progress.done + progress.skipped} of ${progress.total}`;
  const lastDone = checklist.lastCompletedAt;
  const today = toDateString(new Date(), dayCutoffHour);
  const lastDoneDate = lastDone == null ? undefined : toDateString(new Date(lastDone), dayCutoffHour);
  if (lastDoneDate && lastDoneDate !== today) {
    const day = describeDay(lastDoneDate, dayCutoffHour);
    return `Done ${/^(Yesterday|Last )/.test(day) ? day.charAt(0).toLowerCase() + day.slice(1) : day}`;
  }
  return `${progress.total} ${progress.total === 1 ? 'item' : 'items'}`;
}

/** True when today's run is finished or every item is ticked or skipped. */
export function isRunDone(todayRun: ChecklistRun | undefined, progress: ChecklistProgress): boolean {
  return todayRun != null && (todayRun.finishedAt != null || progress.complete);
}

/** Moves the item at `from` to `to`, returning a new array. Out-of-range indexes are clamped. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items;
  const target = Math.max(0, Math.min(items.length - 1, to));
  if (target === from) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/** Slot offset (-1, 0 or 1) for the row at `index` while the row at `from` is dragged to `to`. */
export function getDragShift(index: number, drag: { from: number; to: number } | null): number {
  if (!drag || index === drag.from) return 0;
  if (drag.from < drag.to && index > drag.from && index <= drag.to) return -1;
  if (drag.to < drag.from && index >= drag.to && index < drag.from) return 1;
  return 0;
}

/** Metadata a one-tap log saves: the behaviour's defaults for the amount and manual fields, like a fresh log form. */
export function buildQuickLogMetadata(
  behavior: BehaviorEntry,
  categories: { id: string; metadataFields?: MetadataField[] }[],
): Record<string, string | number> | undefined {
  const fields = getBehaviorMetadataFields(behavior, categories);
  const amountField = getBehaviorAmountField(behavior, fields);
  return buildLogMetadata({
    fields,
    amountField,
    values: getInitialLogMetadataValues(fields, amountField, behavior.defaultMetadata),
    defaultMetadata: behavior.defaultMetadata,
  });
}

/** Behaviour ids already in a list of items, in order. */
export function getChecklistBehaviorIds(items: ChecklistItemInput[]): string[] {
  return items.flatMap(item => (item.kind === 'behavior' ? [item.behaviorId] : []));
}
