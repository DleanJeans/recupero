import type { AppUsageEvent, AppUsageSession } from '../types/app-usage';
import type { AutoTrackApp, LogEntry } from '../types/behavior';
import { getDayStartTimestamp, toDateString } from './date-utils';

/** Same-app sessions closer than this are one session (switching activities, a quick glance at a notification). */
export const APP_SESSION_MERGE_GAP_MS = 60_000;
/** Sessions shorter than this are not logged. */
export const APP_SESSION_MIN_MS = 60_000;
/** How far before the last sync to re-read events, so sessions that straddle it are rebuilt in full. */
export const APP_USAGE_LOOKBACK_MS = 6 * 60 * 60 * 1000;
/** Android keeps detailed usage events for only a few days. */
export const APP_USAGE_MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Turns raw foreground events into per-app sessions. Only one app is in the foreground at a time,
 * so a resume of another app, a pause, or the screen turning off ends the current session.
 * A session still open at the end of the events is dropped: it is either Recupero itself
 * or an app that is still in use and will be picked up by the next sync.
 */
export function buildAppSessions(events: AppUsageEvent[]): AppUsageSession[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const sessions: AppUsageSession[] = [];
  let current: { packageName: string; start: number } | null = null;

  for (const event of sorted) {
    const endsCurrent =
      current != null &&
      (event.type === 'screen_off' ||
        (event.type === 'pause' && event.packageName === current.packageName) ||
        (event.type === 'resume' && event.packageName !== current.packageName));
    if (current && endsCurrent) {
      if (event.timestamp > current.start) {
        sessions.push({ packageName: current.packageName, start: current.start, end: event.timestamp });
      }
      current = null;
    }
    if (event.type === 'resume' && current == null) {
      current = { packageName: event.packageName, start: event.timestamp };
    }
  }

  return mergeAppSessions(sessions);
}

/** Joins same-app sessions separated by less than `gapMs`, per app. */
export function mergeAppSessions(sessions: AppUsageSession[], gapMs = APP_SESSION_MERGE_GAP_MS): AppUsageSession[] {
  const byPackage = new Map<string, AppUsageSession[]>();
  for (const session of sessions) {
    const list = byPackage.get(session.packageName) ?? [];
    list.push(session);
    byPackage.set(session.packageName, list);
  }

  const merged: AppUsageSession[] = [];
  for (const list of byPackage.values()) {
    list.sort((a, b) => a.start - b.start);
    let last: AppUsageSession | null = null;
    for (const session of list) {
      if (last && session.start - last.end < gapMs) {
        last.end = Math.max(last.end, session.end);
      } else {
        last = { ...session };
        merged.push(last);
      }
    }
  }
  return merged.sort((a, b) => a.start - b.start);
}

/**
 * Adds app sessions to a behavior's logs. Sessions that end at or before `syncedUntil` were handled by an
 * earlier sync and are skipped, so a log the user deleted is not brought back. A session that overlaps or
 * nearly touches an existing auto log extends that log instead of adding a second one, which keeps
 * repeated syncs over the same window from creating duplicates. Manual logs are never changed.
 */
export function mergeAppSessionsIntoLogs(
  logs: LogEntry[],
  sessions: AppUsageSession[],
  syncedUntil: number,
  createId: () => string,
  options: { gapMs?: number; minMs?: number } = {},
): { logs: LogEntry[]; changed: boolean } {
  const gapMs = options.gapMs ?? APP_SESSION_MERGE_GAP_MS;
  const minMs = options.minMs ?? APP_SESSION_MIN_MS;
  let nextLogs = logs;
  let changed = false;

  for (const session of sessions) {
    if (session.end <= syncedUntil) continue;

    const index = nextLogs.findIndex(
      log =>
        log.source === 'app-usage' &&
        log.endTimestamp != null &&
        session.start - log.endTimestamp < gapMs &&
        log.timestamp - session.end < gapMs,
    );

    if (index >= 0) {
      const log = nextLogs[index];
      const timestamp = Math.min(log.timestamp, session.start);
      const endTimestamp = Math.max(log.endTimestamp ?? log.timestamp, session.end);
      if (timestamp === log.timestamp && endTimestamp === log.endTimestamp) continue;
      nextLogs = nextLogs.map((candidate, i) => (i === index ? { ...candidate, timestamp, endTimestamp } : candidate));
      changed = true;
      continue;
    }

    if (session.end - session.start < minMs) continue;
    nextLogs = [
      ...nextLogs,
      { id: createId(), timestamp: session.start, endTimestamp: session.end, metadata: {}, source: 'app-usage' },
    ];
    changed = true;
  }

  return { logs: nextLogs, changed };
}

/** Start of the event window for a sync, given each tracked behavior's `syncedUntil`. */
export function getAppUsageQueryStart(syncedUntils: number[], now: number): number {
  const earliest = Math.min(...syncedUntils);
  return Math.max(earliest - APP_USAGE_LOOKBACK_MS, now - APP_USAGE_MAX_WINDOW_MS);
}

/**
 * The `autoTrackApp` value to save from the behavior form. Keeps sync progress when the app is unchanged;
 * a newly chosen app starts from the beginning of today so today's usage is filled in right away.
 */
export function getAutoTrackApp(
  picked: { packageName: string; label: string } | undefined,
  saved: AutoTrackApp | undefined,
  dayCutoffHour: number,
  now = Date.now(),
): AutoTrackApp | undefined {
  if (!picked) return undefined;
  if (saved?.packageName === picked.packageName) return { ...saved, label: picked.label };
  const today = toDateString(new Date(now), dayCutoffHour);
  return {
    packageName: picked.packageName,
    label: picked.label,
    syncedUntil: getDayStartTimestamp(today, dayCutoffHour),
  };
}
