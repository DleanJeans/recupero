import { useCallback, useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useChecklistsStore } from '../store/checklists-store';
import { useSettingsStore } from '../store/settings-store';
import type { ChecklistItem } from '../types/checklist';
import {
  buildQuickLogMetadata,
  getChecklistProgress,
  getRunnableItems,
  getTodayRun,
  isRunDone,
  pruneRun,
} from '../utils/checklist-utils';
import { toDateString } from '../utils/date-utils';

/** Today's state of one checklist, plus the tick, skip and finish actions used by the run screen. */
export function useChecklistRun(checklistId: string) {
  const checklist = useChecklistsStore(
    useCallback(state => state.checklists.find(c => c.id === checklistId), [checklistId]),
  );
  const savedRun = useChecklistsStore(useCallback(state => state.runs[checklistId], [checklistId]));
  const behaviors = useBehaviorStore(state => state.behaviors);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const today = toDateString(new Date(), dayCutoffHour);

  const items = useMemo(() => (checklist ? getRunnableItems(checklist, behaviors) : []), [behaviors, checklist]);
  const run = useMemo(() => pruneRun(getTodayRun(savedRun, today), behaviors), [behaviors, savedRun, today]);
  const progress = useMemo(() => getChecklistProgress(items, run), [items, run]);
  const done = isRunDone(run, progress);

  /** Finishes the run once every item is ticked or skipped. Reads the store directly so it sees the latest tick. */
  const finishIfComplete = useCallback(() => {
    const latest = pruneRun(useChecklistsStore.getState().runs[checklistId], useBehaviorStore.getState().behaviors);
    if (getChecklistProgress(items, latest).complete) useChecklistsStore.getState().finishRun(checklistId);
  }, [checklistId, items]);

  const tickItem = useCallback(
    (item: ChecklistItem) => {
      const { ensureRun, setTick } = useChecklistsStore.getState();
      const current = ensureRun(checklistId, today);
      const at = Date.now();
      if (item.kind === 'plain') {
        setTick(checklistId, item.id, { at });
      } else {
        const { behaviors: latestBehaviors, categories, logBehavior } = useBehaviorStore.getState();
        const behavior = latestBehaviors.find(candidate => candidate.id === item.behaviorId);
        if (!behavior) return;
        const logId = logBehavior(
          behavior.id,
          at,
          buildQuickLogMetadata(behavior, categories),
          undefined,
          undefined,
          current.stackId,
        );
        setTick(checklistId, item.id, { at, logId, behaviorId: behavior.id });
      }
      finishIfComplete();
    },
    [checklistId, finishIfComplete, today],
  );

  /** Unticks an item, deleting the log its tick created. */
  const untickItem = useCallback(
    (item: ChecklistItem) => {
      const tick = run?.ticks[item.id];
      if (!tick) return;
      if (tick.logId && tick.behaviorId) useBehaviorStore.getState().removeLog(tick.behaviorId, tick.logId);
      useChecklistsStore.getState().setTick(checklistId, item.id, undefined);
    },
    [checklistId, run],
  );

  const toggleItem = useCallback(
    (item: ChecklistItem) => {
      const tick = run?.ticks[item.id];
      if (tick) untickItem(item);
      else tickItem(item);
    },
    [run, tickItem, untickItem],
  );

  const toggleSkip = useCallback(
    (item: ChecklistItem) => {
      const tick = run?.ticks[item.id];
      if (tick && !tick.skipped) return;
      const { ensureRun, setTick } = useChecklistsStore.getState();
      ensureRun(checklistId, today);
      setTick(checklistId, item.id, tick ? undefined : { at: Date.now(), skipped: true });
      if (!tick) finishIfComplete();
    },
    [checklistId, finishIfComplete, run, today],
  );

  const tickAllLeft = useCallback(() => {
    for (const item of items) {
      if (!run?.ticks[item.id]) tickItem(item);
    }
  }, [items, run, tickItem]);

  const finish = useCallback(() => {
    useChecklistsStore.getState().ensureRun(checklistId, today);
    useChecklistsStore.getState().finishRun(checklistId);
  }, [checklistId, today]);

  return { checklist, items, run, progress, done, today, toggleItem, toggleSkip, tickAllLeft, finish };
}
