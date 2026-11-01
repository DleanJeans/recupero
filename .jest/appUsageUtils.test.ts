import type { AppUsageEvent } from '../src/types/app-usage';
import type { LogEntry } from '../src/types/behavior';
import {
  APP_USAGE_LOOKBACK_MS,
  APP_USAGE_MAX_WINDOW_MS,
  buildAppSessions,
  buildSiteSessions,
  getAppUsageQueryStart,
  getAutoTrackApp,
  getAutoTrackSite,
  mergeTrackedSessionsIntoLogs,
  normalizeSiteDomain,
  siteMatchesDomain,
} from '../src/utils/app-usage-utils';

const MIN = 60_000;
const ev = (packageName: string, type: AppUsageEvent['type'], minute: number): AppUsageEvent => ({
  packageName,
  type,
  timestamp: minute * MIN,
});

let nextId = 0;
const createId = () => `log-${++nextId}`;

describe('buildAppSessions', () => {
  it('builds sessions from resume/pause pairs and closes on app switch or screen off', () => {
    const sessions = buildAppSessions([
      ev('ig', 'resume', 0),
      ev('ig', 'pause', 10),
      ev('yt', 'resume', 20),
      ev('ig', 'resume', 30), // switching apps ends the YouTube session
      ev('android', 'screen_off', 45),
    ]);
    expect(sessions).toEqual([
      { packageName: 'ig', start: 0, end: 10 * MIN },
      { packageName: 'yt', start: 20 * MIN, end: 30 * MIN },
      { packageName: 'ig', start: 30 * MIN, end: 45 * MIN },
    ]);
  });

  it('merges same-app sessions split by a short gap (activity changes)', () => {
    const sessions = buildAppSessions([
      ev('ig', 'resume', 0),
      ev('ig', 'pause', 5),
      { packageName: 'ig', type: 'resume', timestamp: 5 * MIN + 500 },
      ev('ig', 'pause', 12),
    ]);
    expect(sessions).toEqual([{ packageName: 'ig', start: 0, end: 12 * MIN }]);
  });

  it('drops a pause with no matching resume and a session still open at the end', () => {
    const sessions = buildAppSessions([ev('ig', 'pause', 3), ev('yt', 'resume', 5)]);
    expect(sessions).toEqual([]);
  });

  it('sorts events before building sessions', () => {
    const sessions = buildAppSessions([ev('ig', 'pause', 10), ev('ig', 'resume', 0)]);
    expect(sessions).toEqual([{ packageName: 'ig', start: 0, end: 10 * MIN }]);
  });
});

describe('mergeTrackedSessionsIntoLogs', () => {
  it('adds sessions after syncedUntil as auto logs and skips short ones', () => {
    const { logs, changed } = mergeTrackedSessionsIntoLogs(
      [],
      [
        { start: 0, end: 5 * MIN },
        { start: 10 * MIN, end: 10 * MIN + 30_000 },
      ],
      0,
      createId,
    );
    expect(changed).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ timestamp: 0, endTimestamp: 5 * MIN, source: 'app-usage' });
  });

  it('skips sessions that ended before the last sync, so deleted logs stay deleted', () => {
    const { logs, changed } = mergeTrackedSessionsIntoLogs([], [{ start: 0, end: 5 * MIN }], 5 * MIN, createId);
    expect(changed).toBe(false);
    expect(logs).toEqual([]);
  });

  it('extends an overlapping auto log instead of duplicating it', () => {
    const existing: LogEntry[] = [{ id: 'a', timestamp: 0, endTimestamp: 5 * MIN, source: 'app-usage' }];
    const { logs, changed } = mergeTrackedSessionsIntoLogs(existing, [{ start: 0, end: 9 * MIN }], 5 * MIN, createId);
    expect(changed).toBe(true);
    expect(logs).toEqual([{ id: 'a', timestamp: 0, endTimestamp: 9 * MIN, source: 'app-usage' }]);
  });

  it('is a no-op when re-syncing the same session', () => {
    const existing: LogEntry[] = [{ id: 'a', timestamp: 0, endTimestamp: 9 * MIN, source: 'app-usage' }];
    const result = mergeTrackedSessionsIntoLogs(existing, [{ start: 0, end: 9 * MIN }], 0, createId);
    expect(result.changed).toBe(false);
    expect(result.logs).toBe(existing);
  });

  it('never merges into manual logs', () => {
    const existing: LogEntry[] = [{ id: 'm', timestamp: 0, endTimestamp: 5 * MIN }];
    const { logs } = mergeTrackedSessionsIntoLogs(existing, [{ start: 2 * MIN, end: 8 * MIN }], 0, createId);
    expect(logs).toHaveLength(2);
    expect(logs[0]).toBe(existing[0]);
  });
});

describe('getAppUsageQueryStart', () => {
  it('looks back from the earliest sync, capped at the event retention window', () => {
    const now = 30 * 24 * 60 * MIN;
    expect(getAppUsageQueryStart([now - 60 * MIN, now - 10 * MIN], now)).toBe(now - 60 * MIN - APP_USAGE_LOOKBACK_MS);
    expect(getAppUsageQueryStart([0], now)).toBe(now - APP_USAGE_MAX_WINDOW_MS);
  });
});

describe('getAutoTrackApp', () => {
  const now = new Date(2026, 9, 31, 14, 0).getTime();

  it('returns undefined when tracking is off', () => {
    expect(getAutoTrackApp(undefined, undefined, 0, now)).toBeUndefined();
  });

  it('starts a new app at the beginning of the operational day', () => {
    expect(getAutoTrackApp({ packageName: 'ig', label: 'Instagram' }, undefined, 4, now)).toEqual({
      packageName: 'ig',
      label: 'Instagram',
      syncedUntil: new Date(2026, 9, 31, 4, 0).getTime(),
    });
  });

  it('keeps sync progress when the app is unchanged', () => {
    const saved = { packageName: 'ig', label: 'Instagram', syncedUntil: now - MIN };
    expect(getAutoTrackApp({ packageName: 'ig', label: 'Instagram' }, saved, 0, now)).toEqual(saved);
  });
});

describe('normalizeSiteDomain', () => {
  it('reduces URLs and address bar text to a bare host', () => {
    expect(normalizeSiteDomain('https://www.YouTube.com/watch?v=1')).toBe('youtube.com');
    expect(normalizeSiteDomain('m.reddit.com/r/all')).toBe('m.reddit.com');
    expect(normalizeSiteDomain(' youtube.com ')).toBe('youtube.com');
    expect(normalizeSiteDomain('localhost:8080')).toBe('');
    expect(normalizeSiteDomain('Search or enter address')).toBe('');
  });
});

describe('siteMatchesDomain', () => {
  it('matches the site and its subdomains only', () => {
    expect(siteMatchesDomain('youtube.com', 'youtube.com')).toBe(true);
    expect(siteMatchesDomain('m.youtube.com', 'youtube.com')).toBe(true);
    expect(siteMatchesDomain('notyoutube.com', 'youtube.com')).toBe(false);
  });
});

describe('buildSiteSessions', () => {
  const firefox = (start: number, end: number) => ({
    packageName: 'org.mozilla.firefox',
    start: start * MIN,
    end: end * MIN,
  });
  const mark = (minute: number, host: string) => ({ timestamp: minute * MIN, host });

  it('splits a Firefox session at each site change', () => {
    expect(buildSiteSessions([firefox(0, 30)], [mark(0, 'youtube.com'), mark(10, 'reddit.com')])).toEqual([
      { host: 'youtube.com', start: 0, end: 10 * MIN },
      { host: 'reddit.com', start: 10 * MIN, end: 30 * MIN },
    ]);
  });

  it('carries the last site into a later session and ignores other apps', () => {
    expect(
      buildSiteSessions([{ packageName: 'ig', start: 0, end: 5 * MIN }, firefox(20, 25)], [mark(1, 'youtube.com')]),
    ).toEqual([{ host: 'youtube.com', start: 20 * MIN, end: 25 * MIN }]);
  });

  it('drops time on pages with no site and time with no marks at all', () => {
    expect(buildSiteSessions([firefox(0, 30)], [mark(5, ''), mark(10, 'youtube.com'), mark(20, '')])).toEqual([
      { host: 'youtube.com', start: 10 * MIN, end: 20 * MIN },
    ]);
  });

  it('joins visits to the same site across a short Firefox break', () => {
    expect(
      buildSiteSessions([firefox(0, 10), { ...firefox(10, 20), start: 10 * MIN + 20_000 }], [mark(0, 'x.com')]),
    ).toEqual([{ host: 'x.com', start: 0, end: 20 * MIN }]);
  });
});

describe('mergeTrackedSessionsIntoLogs with site visits', () => {
  it('tags site logs and keeps them apart from app logs', () => {
    const existing: LogEntry[] = [{ id: 'a', timestamp: 0, endTimestamp: 5 * MIN, source: 'app-usage' }];
    const { logs } = mergeTrackedSessionsIntoLogs(existing, [{ start: 0, end: 5 * MIN }], 0, createId, {
      source: 'site-visit',
    });
    expect(logs).toHaveLength(2);
    expect(logs[1]).toMatchObject({ source: 'site-visit', timestamp: 0, endTimestamp: 5 * MIN });
  });
});

describe('getAutoTrackSite', () => {
  const now = new Date(2026, 9, 31, 14, 0).getTime();

  it('starts a new site today and keeps progress for the same site', () => {
    const fresh = getAutoTrackSite('youtube.com', undefined, 0, now);
    expect(fresh).toEqual({ domain: 'youtube.com', syncedUntil: new Date(2026, 9, 31).getTime() });
    const saved = { domain: 'youtube.com', syncedUntil: now };
    expect(getAutoTrackSite('youtube.com', saved, 0, now)).toBe(saved);
    expect(getAutoTrackSite(undefined, saved, 0, now)).toBeUndefined();
  });
});
