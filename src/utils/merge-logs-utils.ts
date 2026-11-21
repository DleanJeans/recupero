import type { BehaviorEntry, Category, LogEntry } from '../types/behavior';

export interface MovedLogs {
  logs: LogEntry[];
  /** Logs that lost at least one metadata value the target behaviour has no field for. */
  droppedCount: number;
}

/**
 * Logs of `source` re-keyed for `target`. Metadata is keyed by category field, so logs moving to another category
 * are matched by field name (case-insensitive); values with no matching field are dropped. Keys that are not
 * category fields (e.g. notes) always stay. Everything else on the log (cues, sleep, ids) is kept as is.
 */
export function prepareMovedLogs(
  logs: LogEntry[],
  sourceCategory: Category | undefined,
  targetCategory: Category | undefined,
): MovedLogs {
  if (!sourceCategory || !targetCategory || sourceCategory.id === targetCategory.id) {
    return { logs, droppedCount: 0 };
  }
  const sourceFields = sourceCategory.metadataFields ?? [];
  const targetFields = targetCategory.metadataFields ?? [];
  const sourceKeys = new Set(sourceFields.map(field => field.key));
  const keyMap = new Map<string, string>();
  for (const field of sourceFields) {
    const match = targetFields.find(target => target.label.trim().toLowerCase() === field.label.trim().toLowerCase());
    if (match) keyMap.set(field.key, match.key);
  }

  let droppedCount = 0;
  const moved = logs.map(log => {
    if (!log.metadata) return log;
    let dropped = false;
    const metadata: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(log.metadata)) {
      if (!sourceKeys.has(key)) metadata[key] = value;
      else if (keyMap.has(key)) metadata[keyMap.get(key) as string] = value;
      else dropped = true;
    }
    if (dropped) droppedCount += 1;
    return { ...log, metadata };
  });
  return { logs: moved, droppedCount };
}

/** Behaviour list after moving every log of `fromId` into `toId` (logs ordered by time, last time recomputed). */
export function mergeBehaviorLogsInto(
  behaviors: BehaviorEntry[],
  categories: Category[],
  fromId: string,
  toId: string,
  archiveSource: boolean,
  now: number,
): BehaviorEntry[] {
  const from = behaviors.find(b => b.id === fromId);
  const to = behaviors.find(b => b.id === toId);
  if (!from || !to || fromId === toId) return behaviors;
  const { logs: moved } = prepareMovedLogs(
    from.logs,
    categories.find(c => c.id === from.categoryId),
    categories.find(c => c.id === to.categoryId),
  );
  const logs = [...to.logs, ...moved].sort((a, b) => a.timestamp - b.timestamp);
  const lastEnd = (list: LogEntry[]) =>
    list.length > 0 ? Math.max(...list.map(log => log.endTimestamp ?? log.timestamp)) : null;
  return behaviors.map(b => {
    if (b.id === toId) return { ...b, logs, lastTimestamp: lastEnd(logs) };
    if (b.id === fromId) {
      return { ...b, logs: [], lastTimestamp: null, ...(archiveSource ? { archivedAt: now } : {}) };
    }
    return b;
  });
}
