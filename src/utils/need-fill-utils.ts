import type { NeedId } from '../types/need';

/** A need must rise by at least this many points to get an overlay (ignores rounding noise). */
export const NEED_FILL_MIN_RISE = 2;
/** A fill is shown only if the screen gets back to Routines within this long, so old syncs don't pop up. */
export const NEED_FILL_MAX_AGE_MS = 15_000;
/** Cap on rows in the overlay; the biggest rises win. */
export const NEED_FILL_MAX_ROWS = 4;

export interface NeedFill {
  needId: NeedId;
  from: number;
  to: number;
}

/**
 * Needs whose level rose since `previous`. Needs being filled by a running timer are skipped,
 * since they creep up all the time. Biggest rise first.
 */
export function getNeedFills(
  previous: ReadonlyMap<NeedId, number>,
  current: ReadonlyArray<{ id: NeedId; level?: number; timerFullInMs?: number }>,
): NeedFill[] {
  const fills: NeedFill[] = [];
  for (const need of current) {
    if (need.level == null || need.timerFullInMs != null) continue;
    const from = previous.get(need.id) ?? 0;
    if (need.level - from >= NEED_FILL_MIN_RISE) fills.push({ needId: need.id, from, to: need.level });
  }
  return fills.sort((a, b) => b.to - b.from - (a.to - a.from)).slice(0, NEED_FILL_MAX_ROWS);
}

/** Merges new fills into waiting ones: same need keeps the earliest `from` and the latest `to`. */
export function mergeNeedFills(waiting: NeedFill[], added: NeedFill[]): NeedFill[] {
  const byNeed = new Map(waiting.map(fill => [fill.needId, fill]));
  for (const fill of added) {
    const existing = byNeed.get(fill.needId);
    byNeed.set(fill.needId, existing ? { ...fill, from: Math.min(existing.from, fill.from) } : fill);
  }
  return [...byNeed.values()].filter(fill => fill.to - fill.from >= NEED_FILL_MIN_RISE).slice(0, NEED_FILL_MAX_ROWS);
}
