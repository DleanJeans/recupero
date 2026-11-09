import type { LogEntry } from '../types/behavior';
import type { HealthAzmDay, HealthSleep } from '../types/health';
import { addDaysToDateString, MS_PER_DAY, toDateString } from './date-utils';

export const GOOGLE_HEALTH_API_BASE = 'https://health.googleapis.com/v4/users/me';
export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
];
export const GOOGLE_AUTH_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/** Fitbit's default: 150 minutes a week is about 22 a day. */
export const DEFAULT_AZM_DAILY_GOAL = 22;
/** How far back the first sync reads, and how far each later sync re-reads so late or edited data lands. */
export const HEALTH_FIRST_SYNC_DAYS = 7;
export const HEALTH_RESYNC_OVERLAP_MS = 2 * MS_PER_DAY;
/** Syncs started by opening the app wait this long since the last one; "Sync now" doesn't. */
export const HEALTH_AUTO_SYNC_GAP_MS = 15 * 60_000;
/** Sleep ids already turned into logs are remembered so a log the user deleted doesn't come back. */
export const MAX_IMPORTED_SLEEP_IDS = 400;

/** Redirect scheme Google gives an iOS-type OAuth client: the client id reversed. */
export function getGoogleRedirectScheme(clientId: string): string | undefined {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId.endsWith(suffix)) return undefined;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

/** Start of the window to read: a week back the first time, else the last sync minus some overlap. */
export function getHealthSyncStart(lastSyncAt: number | undefined, now: number): number {
  const firstStart = now - HEALTH_FIRST_SYNC_DAYS * MS_PER_DAY;
  if (lastSyncAt == null) return firstStart;
  return Math.max(firstStart, lastSyncAt - HEALTH_RESYNC_OVERLAP_MS);
}

/** RFC 3339 in UTC, as the API's filters expect for physical times. */
export function toRfc3339(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function getSleepFilter(since: number): string {
  return `sleep.interval.end_time >= "${toRfc3339(since)}"`;
}

/** The API sends int64 values as strings. */
function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function toTime(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | undefined {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : undefined;
}

/** One sleep data point from `dataTypes/sleep/dataPoints`, or undefined if it lacks times. */
export function parseSleepDataPoint(point: unknown): HealthSleep | undefined {
  const root = asObject(point);
  const sleep = asObject(root?.sleep);
  const interval = asObject(sleep?.interval);
  const id = typeof root?.name === 'string' ? root.name : root?.dataPointName;
  const start = toTime(interval?.startTime);
  const end = toTime(interval?.endTime);
  if (typeof id !== 'string' || start == null || end == null || end <= start) return undefined;

  const summary = asObject(sleep?.summary);
  const stageMinutes: Record<string, number> = {};
  const stages = Array.isArray(summary?.stagesSummary) ? summary.stagesSummary : [];
  for (const stage of stages) {
    const entry = asObject(stage);
    const minutes = toNumber(entry?.minutes);
    if (typeof entry?.type === 'string' && minutes != null) stageMinutes[entry.type.toUpperCase()] = minutes;
  }

  const spanMinutes = Math.round((end - start) / 60_000);
  const awake = toNumber(summary?.minutesAwake) ?? stageMinutes.AWAKE ?? stageMinutes.WAKE;
  const asleep = toNumber(summary?.minutesAsleep) ?? (awake != null ? spanMinutes - awake : spanMinutes);
  const result: HealthSleep = { id, start, end, asleepMinutes: Math.max(0, Math.min(spanMinutes, asleep)) };
  if (awake != null) result.awakeMinutes = awake;
  if (stageMinutes.DEEP != null) result.deepMinutes = stageMinutes.DEEP;
  if (stageMinutes.LIGHT != null) result.lightMinutes = stageMinutes.LIGHT;
  if (stageMinutes.REM != null) result.remMinutes = stageMinutes.REM;
  return result;
}

/** Google's civil date ({ year, month, day }) for a "YYYY-MM-DD" string. */
export function toCivilDate(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return { year, month, day: date };
}

/** Body for `active-zone-minutes/dataPoints:dailyRollUp`: whole days from `firstDay` through `lastDay`. */
export function getAzmRollUpBody(firstDay: string, lastDay: string) {
  return {
    range: {
      start: { date: toCivilDate(firstDay), time: {} },
      end: { date: toCivilDate(addDaysToDateString(lastDay, 1)), time: {} },
    },
    windowSizeDays: 1,
  };
}

/** One day of Active Zone Minutes from a daily roll-up: fat burn + cardio + peak (cardio/peak already count double). */
export function parseAzmRollupPoint(point: unknown): HealthAzmDay | undefined {
  const root = asObject(point);
  const civil = asObject(root?.civilStartTime);
  const date = asObject(civil?.date);
  const year = toNumber(date?.year);
  const month = toNumber(date?.month);
  const day = toNumber(date?.day);
  const value = asObject(root?.activeZoneMinutes);
  if (year == null || month == null || day == null || !value) return undefined;
  const minutes =
    (toNumber(value.sumInFatBurnHeartZone) ?? 0) +
    (toNumber(value.sumInCardioHeartZone) ?? 0) +
    (toNumber(value.sumInPeakHeartZone) ?? 0);
  return { day: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, minutes };
}

/**
 * Replaces the synced days (from `firstFreshDay` on) with fresh totals; a synced day with no
 * roll-up becomes missing. Days older than `keepDays` are dropped.
 */
export function mergeAzmDays(
  saved: Record<string, number>,
  fresh: HealthAzmDay[],
  firstFreshDay: string,
  now: number,
  keepDays = 60,
): Record<string, number> {
  const oldestKept = toDateString(new Date(now - keepDays * MS_PER_DAY));
  const result: Record<string, number> = {};
  for (const [day, minutes] of Object.entries(saved)) {
    if (day >= oldestKept && day < firstFreshDay) result[day] = minutes;
  }
  for (const { day, minutes } of fresh) {
    if (day >= oldestKept && day >= firstFreshDay) result[day] = minutes;
  }
  return result;
}

function overlapMs(a: { start: number; end: number }, b: { start: number; end: number }) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function toSleepDetails(sleep: HealthSleep): NonNullable<LogEntry['sleep']> {
  const details: NonNullable<LogEntry['sleep']> = { asleepMinutes: sleep.asleepMinutes };
  if (sleep.awakeMinutes != null) details.awakeMinutes = sleep.awakeMinutes;
  if (sleep.deepMinutes != null) details.deepMinutes = sleep.deepMinutes;
  if (sleep.lightMinutes != null) details.lightMinutes = sleep.lightMinutes;
  if (sleep.remMinutes != null) details.remMinutes = sleep.remMinutes;
  return details;
}

/**
 * Turns synced sleeps into logs. A sleep already logged (same external id) is updated if Fitbit
 * changed it. A new sleep is skipped when it was imported before (the user deleted that log) or
 * when a manual log already covers most of it.
 */
export function mergeSleepIntoLogs(
  logs: LogEntry[],
  sleeps: HealthSleep[],
  importedIds: string[],
  createId: () => string,
): { logs: LogEntry[]; importedIds: string[]; changed: boolean } {
  let nextLogs = logs;
  const imported = new Set(importedIds);
  const added: string[] = [];
  let changed = false;

  for (const sleep of sleeps) {
    const sleepDetails = toSleepDetails(sleep);
    const index = nextLogs.findIndex(log => log.externalId === sleep.id);
    if (index >= 0) {
      const log = nextLogs[index];
      const same =
        log.timestamp === sleep.start &&
        log.endTimestamp === sleep.end &&
        JSON.stringify(log.sleep) === JSON.stringify(sleepDetails);
      if (!same) {
        nextLogs = nextLogs.map((candidate, i) =>
          i === index
            ? { ...candidate, timestamp: sleep.start, endTimestamp: sleep.end, sleep: sleepDetails }
            : candidate,
        );
        changed = true;
      }
      continue;
    }
    if (imported.has(sleep.id)) continue;

    const span = { start: sleep.start, end: sleep.end };
    const coveredByManual = nextLogs.some(log => {
      if (log.source != null || log.endTimestamp == null) return false;
      const other = { start: log.timestamp, end: log.endTimestamp };
      const shorter = Math.min(span.end - span.start, other.end - other.start);
      return shorter > 0 && overlapMs(span, other) >= shorter / 2;
    });
    imported.add(sleep.id);
    added.push(sleep.id);
    if (coveredByManual) continue;

    nextLogs = [
      ...nextLogs,
      {
        id: createId(),
        timestamp: sleep.start,
        endTimestamp: sleep.end,
        metadata: {},
        source: 'google-health',
        externalId: sleep.id,
        sleep: sleepDetails,
      },
    ];
    changed = true;
  }

  return {
    logs: nextLogs,
    importedIds: added.length > 0 ? [...importedIds, ...added].slice(-MAX_IMPORTED_SLEEP_IDS) : importedIds,
    changed,
  };
}

/** "7h 12m". */
export function formatSleepMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Sum of the last 7 calendar days including today. */
export function getAzmWeekTotal(byDay: Record<string, number>, now: number): number {
  const today = toDateString(new Date(now));
  let total = 0;
  for (let i = 0; i < 7; i++) total += byDay[addDaysToDateString(today, -i)] ?? 0;
  return total;
}

const SLEEP_NAME = /\b(sleep|nap|bed)/i;

/** Behaviours offered for synced sleep: unarchived, ones named like sleep first, then by name. */
export function getSleepBehaviorChoices<T extends { id: string; name: string; archivedAt?: number }>(behaviors: T[]) {
  return behaviors
    .filter(behavior => behavior.archivedAt == null)
    .sort((a, b) => {
      const sleepA = SLEEP_NAME.test(a.name) ? 0 : 1;
      const sleepB = SLEEP_NAME.test(b.name) ? 0 : 1;
      return sleepA - sleepB || a.name.localeCompare(b.name);
    });
}

/** Days in the last 7 (including today) that reached the goal. */
export function getAzmGoalDaysThisWeek(byDay: Record<string, number>, goal: number, now: number): number {
  const today = toDateString(new Date(now));
  let met = 0;
  for (let i = 0; i < 7; i++) if ((byDay[addDaysToDateString(today, -i)] ?? 0) >= goal) met++;
  return met;
}
