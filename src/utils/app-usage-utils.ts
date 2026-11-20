import type { AppUsageEvent, AppUsageSession, MediaEvent, SiteMark, SiteSession } from '../types/app-usage';
import type { AutoTrackApp, AutoTrackSite, LogEntry, LogSource } from '../types/behavior';
import { getDayStartTimestamp, toDateString } from './date-utils';

/** Same-app sessions closer than this are one session (switching activities, a quick glance at a notification). */
export const APP_SESSION_MERGE_GAP_MS = 60_000;
/** Auto logs of one behaviour closer than this (default, minutes) are one log: tabbing out to test another app. */
export const DEFAULT_APP_LOG_MERGE_GAP_MIN = 3;
export const MIN_APP_LOG_MERGE_GAP_MIN = 1;
export const MAX_APP_LOG_MERGE_GAP_MIN = 10;
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
  return mergeSessionsByKey(sessions, session => session.packageName, gapMs);
}

function mergeSessionsByKey<T extends { start: number; end: number }>(
  sessions: T[],
  keyOf: (session: T) => string,
  gapMs: number,
): T[] {
  const byKey = new Map<string, T[]>();
  for (const session of sessions) {
    const list = byKey.get(keyOf(session)) ?? [];
    list.push(session);
    byKey.set(keyOf(session), list);
  }

  const merged: T[] = [];
  for (const list of byKey.values()) {
    list.sort((a, b) => a.start - b.start);
    let last: T | null = null;
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
 * Adds tracked sessions (app use or site visits) to a behavior's logs. Sessions that end at or before `syncedUntil` were handled by an
 * earlier sync and are skipped, so a log the user deleted is not brought back. A session that overlaps or
 * nearly touches an existing auto log extends that log instead of adding a second one, which keeps
 * repeated syncs over the same window from creating duplicates. Manual logs are never changed.
 */
export function mergeTrackedSessionsIntoLogs(
  logs: LogEntry[],
  sessions: { start: number; end: number }[],
  syncedUntil: number,
  createId: () => string,
  options: { source?: LogSource; gapMs?: number; minMs?: number } = {},
): { logs: LogEntry[]; changed: boolean } {
  const source = options.source ?? 'app-usage';
  const gapMs = options.gapMs ?? APP_SESSION_MERGE_GAP_MS;
  const minMs = options.minMs ?? APP_SESSION_MIN_MS;
  let nextLogs = logs;
  let changed = false;

  for (const session of sessions) {
    if (session.end <= syncedUntil) continue;

    const index = nextLogs.findIndex(
      log =>
        log.source === source &&
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
      { id: createId(), timestamp: session.start, endTimestamp: session.end, metadata: {}, source },
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

export const FIREFOX_PACKAGES = [
  'org.mozilla.firefox',
  'org.mozilla.firefox_beta',
  'org.mozilla.fenix',
  'org.mozilla.fennec_fdroid',
  'io.github.forkmaintainers.iceraven',
  'us.spotco.fennec_dos',
  'io.gitlab.librewolf',
  'io.gitlab.librewolf_community',
  'org.torproject.torbrowser',
];

const HOST_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** "https://www.YouTube.com/watch" -> "youtube.com". Returns '' when the text isn't a site. */
export function normalizeSiteDomain(text: string): string {
  let value = text.trim().toLowerCase();
  const schemeIndex = value.indexOf('://');
  if (schemeIndex >= 0) value = value.slice(schemeIndex + 3);
  value = value.split(/[/?#:]/)[0].replace(/^www\./, '');
  return HOST_PATTERN.test(value) ? value : '';
}

/** Whether a visited host belongs to a tracked site; subdomains count (m.youtube.com is youtube.com). */
export function siteMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Splits Firefox foreground sessions into per-site visits using address bar marks. The site at the start of
 * a session is the last mark before it, since Firefox reopens on the tab you left. Time with no site
 * (new tab, home page) is dropped. Same-site visits closer than the merge gap are joined.
 */
export function buildSiteSessions(appSessions: AppUsageSession[], marks: SiteMark[]): SiteSession[] {
  const sortedMarks = [...marks].sort((a, b) => a.timestamp - b.timestamp);
  const visits: SiteSession[] = [];

  for (const session of appSessions) {
    if (!FIREFOX_PACKAGES.includes(session.packageName)) continue;
    let host = '';
    let segmentStart = session.start;
    for (const mark of sortedMarks) {
      if (mark.timestamp <= session.start) {
        host = mark.host;
        continue;
      }
      if (mark.timestamp >= session.end) break;
      if (mark.host === host) continue;
      if (host) visits.push({ host, start: segmentStart, end: mark.timestamp });
      host = mark.host;
      segmentStart = mark.timestamp;
    }
    if (host) visits.push({ host, start: segmentStart, end: session.end });
  }

  return mergeSessionsByKey(visits, visit => visit.host, APP_SESSION_MERGE_GAP_MS);
}

/** The `autoTrackSite` value to save from the behavior form, with the same sync rules as `getAutoTrackApp`. */
export function getAutoTrackSite(
  domain: string | undefined,
  saved: AutoTrackSite | undefined,
  dayCutoffHour: number,
  now = Date.now(),
): AutoTrackSite | undefined {
  if (!domain) return undefined;
  if (saved?.domain === domain) return saved;
  const today = toDateString(new Date(now), dayCutoffHour);
  return { domain, syncedUntil: getDayStartTimestamp(today, dayCutoffHour) };
}

/** The behavior that already auto-tracks this app or site, if any, so picking it again doesn't make a copy. */
export function findAutoTrackedBehavior<
  T extends { archivedAt?: number; autoTrackApp?: AutoTrackApp; autoTrackSite?: AutoTrackSite },
>(behaviors: T[], target: { packageName: string } | { domain: string }): T | undefined {
  return behaviors.find(behavior => {
    if (behavior.archivedAt != null) return false;
    if ('packageName' in target) return behavior.autoTrackApp?.packageName === target.packageName;
    return behavior.autoTrackSite?.domain === target.domain;
  });
}

/** Icon for a tracked website: its favicon. */
export function getSiteFaviconUri(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

const SECOND_LEVEL_SUFFIXES = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);

/** "reddit.com" -> "Reddit", "news.bbc.co.uk" -> "Bbc". The offline fallback for a site's display name. */
export function getSiteFallbackName(domain: string): string {
  const parts = domain.split('.').filter(Boolean);
  while (parts.length > 2 && SECOND_LEVEL_SUFFIXES.has(parts[parts.length - 2])) parts.splice(parts.length - 2, 1);
  const label = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? domain);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** The site's own name from its home page HTML: og:site_name, then application-name. '' when it has neither. */
export function parseSiteName(html: string): string {
  for (const key of ['og:site_name', 'application-name']) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const keyMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
      if (keyMatch?.[1].toLowerCase() !== key) continue;
      const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      const name = content ? decodeEntities(content) : '';
      if (name && name.length <= 40) return name;
    }
  }
  return '';
}

/** Looks up a site's display name online; falls back to the capitalised domain when offline or unnamed. */
export async function fetchSiteName(domain: string, timeoutMs = 5000): Promise<string> {
  const fallback = getSiteFallbackName(domain);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://${domain}`, { signal: controller.signal });
    const html = (await response.text()).slice(0, 200_000);
    return parseSiteName(html) || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turns play/pause changes into per-app listening sessions. A session still playing at the end of the
 * events is dropped; the next sync picks it up once it stops.
 */
export function buildMediaSessions(events: MediaEvent[]): AppUsageSession[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const playingSince = new Map<string, number>();
  const sessions: AppUsageSession[] = [];
  for (const event of sorted) {
    const since = playingSince.get(event.packageName);
    if (event.playing && since == null) playingSince.set(event.packageName, event.timestamp);
    if (!event.playing && since != null) {
      playingSince.delete(event.packageName);
      if (event.timestamp > since)
        sessions.push({ packageName: event.packageName, start: since, end: event.timestamp });
    }
  }
  return mergeAppSessions(sessions);
}

/**
 * Joins back-to-back auto logs (app use or site visits) of one behaviour whose gap is under `gapMs` into one log
 * from the first start to the last end, so the gaps count as time too. Logs the user touched (edited, with metadata,
 * cues or a manual need amount) and manual logs are left alone. Running it again changes nothing.
 */
export function mergeCloseAutoLogs(
  logs: LogEntry[],
  gapMs: number,
  protectedIds: ReadonlySet<string> = new Set(),
): { logs: LogEntry[]; changed: boolean } {
  const isMergeable = (log: LogEntry) =>
    (log.source === 'app-usage' || log.source === 'site-visit') &&
    log.endTimestamp != null &&
    log.editedAt == null &&
    !log.cues?.length &&
    !log.stackId &&
    Object.keys(log.metadata ?? {}).length === 0 &&
    !protectedIds.has(log.id);

  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const result: LogEntry[] = [];
  let changed = false;
  for (const log of sorted) {
    // Only the newest same-source log before this one is a candidate, and only when it directly precedes it.
    const prev = result[result.length - 1];
    if (
      prev &&
      isMergeable(prev) &&
      isMergeable(log) &&
      prev.source === log.source &&
      log.timestamp - (prev.endTimestamp ?? 0) < gapMs
    ) {
      result[result.length - 1] = { ...prev, endTimestamp: Math.max(prev.endTimestamp ?? 0, log.endTimestamp ?? 0) };
      changed = true;
    } else {
      result.push(log);
    }
  }
  return changed ? { logs: result, changed } : { logs, changed };
}

/** Milliseconds of screen time per app package, summed over sessions. */
export function sumAppUsage(sessions: AppUsageSession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(session.packageName, (totals.get(session.packageName) ?? 0) + (session.end - session.start));
  }
  return totals;
}

/** Plain-language report of the watcher's last address bar read (JSON from the native module). */
export function formatSiteDebug(json: string, now = Date.now()): string {
  if (!json) return 'Nothing yet. Open Firefox, visit a site, then come back and tap again.';
  try {
    const data = JSON.parse(json) as {
      time: number;
      package: string;
      source: string | null;
      text: string | null;
      host: string | null;
      candidates: string | null;
    };
    const ago = Math.max(0, Math.round((now - data.time) / 1000));
    const when = `${ago < 90 ? `${ago}s` : `${Math.round(ago / 60)} min`} ago`;
    if (data.source == null) {
      return `Seen ${when} in ${data.package}, but no address bar found. Text on screen:\n${data.candidates || '(none)'}`;
    }
    const counted = data.host ? `counts as ${data.host}` : 'not a site (ignored)';
    return `Seen ${when} in ${data.package}: "${data.text}" (${data.source}) ${counted}.`;
  } catch {
    return 'Could not read the watcher report.';
  }
}

/** How long an app must stay closed before a timer that opened it stops by itself. */
export const APP_TIMER_CLOSE_GRACE_MS = 2 * 60_000;

/**
 * When `packageName` was last closed, for a timer that started at `since`: the end of its last session
 * after `since`, once it has stayed closed for `graceMs`. Undefined while the app is still on screen,
 * if it was never opened after `since`, or if it was closed too recently (it may come right back).
 */
export function getAppClosedAt(
  events: AppUsageEvent[],
  packageName: string,
  since: number,
  now: number,
  graceMs = APP_TIMER_CLOSE_GRACE_MS,
): number | undefined {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let foreground: string | null = null;
  for (const event of sorted) {
    if (event.type === 'resume') foreground = event.packageName;
    else if (event.type === 'screen_off' || (event.type === 'pause' && event.packageName === foreground))
      foreground = null;
  }
  if (foreground === packageName) return undefined;
  const sessions = buildAppSessions(sorted).filter(
    session => session.packageName === packageName && session.end > since,
  );
  const last = sessions[sessions.length - 1];
  if (!last || now - last.end < graceMs) return undefined;
  return last.end;
}
