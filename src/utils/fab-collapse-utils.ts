const TOP_ZONE = 24;
const MIN_DELTA = 6;

/**
 * Whether an extending FAB should be collapsed after a scroll move.
 * Expanded near the top and when scrolling up, collapsed when scrolling down; tiny jitters keep the current state.
 */
export function nextFabCollapsed(current: boolean, prevY: number, y: number): boolean {
  if (y <= TOP_ZONE) return false;
  const delta = y - prevY;
  if (delta > MIN_DELTA) return true;
  if (delta < -MIN_DELTA) return false;
  return current;
}
