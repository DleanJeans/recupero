/** Most saved-for-later pills shown before the rest collapse into a "+N more" pill. */
export const MAX_SAVED_FABS = 3;
const SHOWN_WHEN_OVERFLOWING = 2;

interface SavedFabSplit<T> {
  /** Pills to show, oldest first, so the newest one sits nearest the Add behavior button. */
  shown: T[];
  /** How many saved logs are hidden behind "+N more". */
  overflow: number;
}

/** Up to 3 saved logs are shown; with more, the 2 newest are shown plus a "+N more" pill. */
export function splitSavedFabs<T extends { savedAt: number }>(pending: T[]): SavedFabSplit<T> {
  const byNewest = [...pending].sort((a, b) => b.savedAt - a.savedAt);
  if (byNewest.length <= MAX_SAVED_FABS) return { shown: byNewest.reverse(), overflow: 0 };
  return {
    shown: byNewest.slice(0, SHOWN_WHEN_OVERFLOWING).reverse(),
    overflow: byNewest.length - SHOWN_WHEN_OVERFLOWING,
  };
}
