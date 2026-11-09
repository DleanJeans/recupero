import { useMemo } from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import { useChecklistsStore } from '../store/checklists-store';
import { useSettingsStore } from '../store/settings-store';
import type { Checklist } from '../types/checklist';
import {
  describeChecklistStatus,
  getChecklistProgress,
  getRunnableItems,
  getTodayRun,
  isRunDone,
  pruneRun,
} from '../utils/checklist-utils';
import { toDateString } from '../utils/date-utils';

/** Today's progress of one checklist for the Routines strip: counts, status text and whether it is done or started. */
export function useChecklistStatus(checklist: Checklist) {
  const savedRun = useChecklistsStore(state => state.runs[checklist.id]);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const today = toDateString(new Date(), dayCutoffHour);

  return useMemo(() => {
    const items = getRunnableItems(checklist, behaviors);
    const run = pruneRun(getTodayRun(savedRun, today), behaviors);
    const progress = getChecklistProgress(items, run);
    const done = isRunDone(run, progress);
    const finished = progress.done + progress.skipped;
    return {
      progress,
      status: describeChecklistStatus(checklist, run, progress, dayCutoffHour),
      done,
      started: !done && finished > 0,
      fraction: done ? 1 : progress.total > 0 ? finished / progress.total : 0,
      /** "2/4" while in progress, empty otherwise. */
      count: !done && finished > 0 ? `${finished}/${progress.total}` : '',
    };
  }, [behaviors, checklist, dayCutoffHour, savedRun, today]);
}
