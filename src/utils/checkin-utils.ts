import type { BodySensationLog, MoodId, MoodLog } from '../types/cue';
import { addDaysToDateString, DEFAULT_DAY_CUTOFF_HOUR, toDateString } from './date-utils';
import { getLevel, getLevelProgress, getXpToNextLevel } from './xp-utils';

/** XP for logging how you feel. Logs have no duration, so each earns a fixed amount. */
export const CHECKIN_MOOD_XP = 5;
export const CHECKIN_BODY_XP = 3;
/** Only the first logs of a day earn XP, so tapping repeatedly can't farm it. */
export const CHECKIN_DAILY_XP_LOGS = 4;

const MS_PER_HOUR = 3600000;

export const CHECKIN_NOTIFICATION_KIND = 'checkin';
export const CHECKIN_NUDGE_ID_PREFIX = 'checkin-nudge:';
export const CHECKIN_ACTION_PREFIX = 'checkin:mood:';
/** Moods offered as buttons on the nudge notification (Android shows at most three). */
export const CHECKIN_NUDGE_MOODS: readonly MoodId[] = ['good', 'okay', 'stressed'];
const NUDGE_DAYS_AHEAD = 3;
const MIN_NUDGE_HOUR = 7;
const MAX_NUDGE_HOUR = 22;

export interface CheckInSettings {
  nudgesEnabled: boolean;
  /** Hours of the day (0-23) when a nudge may fire. */
  nudgeHours: number[];
  /** A nudge is skipped when something was logged within this many hours before it. */
  skipWithinHours: number;
  streakSaverEnabled: boolean;
  streakSaverHour: number;
  /** The current mood/body square turns amber after this many hours. */
  staleHours: number;
}

export const DEFAULT_CHECKIN_SETTINGS: CheckInSettings = {
  nudgesEnabled: false,
  nudgeHours: [9, 13, 19],
  skipWithinHours: 3,
  streakSaverEnabled: true,
  streakSaverHour: 21,
  staleHours: 4,
};

export const CHECKIN_SELECTABLE_HOURS: readonly number[] = Array.from(
  { length: MAX_NUDGE_HOUR - MIN_NUDGE_HOUR + 1 },
  (_, index) => MIN_NUDGE_HOUR + index,
);

export interface CheckInEvent {
  id: string;
  ts: number;
  kind: 'mood' | 'body';
  /** MoodId or BodySensationId. */
  value: string;
  /** XP earned: 0 once the day's XP logs are used up. */
  xp: number;
}

/** Mood and body logs merged oldest to newest, each with the XP it earned. */
export function getCheckInEvents(
  moodLogs: readonly MoodLog[],
  bodyLogs: readonly BodySensationLog[],
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): CheckInEvent[] {
  const raw = [
    ...moodLogs.map(log => ({ id: log.id, ts: log.ts, kind: 'mood' as const, value: log.mood })),
    ...bodyLogs.map(log => ({ id: log.id, ts: log.ts, kind: 'body' as const, value: log.sensation })),
  ].sort((a, b) => a.ts - b.ts);
  const perDay = new Map<string, number>();
  const seen = new Set<string>();
  return raw.map(event => {
    // Several picks logged together (same kind and timestamp) are one check-in: only the first earns XP.
    const groupKey = `${event.kind}:${event.ts}`;
    if (seen.has(groupKey)) return { ...event, xp: 0 };
    seen.add(groupKey);
    const day = toDateString(new Date(event.ts), dayCutoffHour);
    const count = perDay.get(day) ?? 0;
    perDay.set(day, count + 1);
    const xp = count < CHECKIN_DAILY_XP_LOGS ? (event.kind === 'mood' ? CHECKIN_MOOD_XP : CHECKIN_BODY_XP) : 0;
    return { ...event, xp };
  });
}

export function getCheckInXp(events: readonly CheckInEvent[]): number {
  return events.reduce((total, event) => total + event.xp, 0);
}

/** XP a log made right now would earn, given today's earlier logs. */
export function getNextCheckInXp(
  events: readonly CheckInEvent[],
  kind: 'mood' | 'body',
  now = Date.now(),
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): number {
  const today = toDateString(new Date(now), dayCutoffHour);
  const loggedToday = new Set(
    events
      .filter(event => toDateString(new Date(event.ts), dayCutoffHour) === today)
      .map(event => `${event.kind}:${event.ts}`),
  ).size;
  if (loggedToday >= CHECKIN_DAILY_XP_LOGS) return 0;
  return kind === 'mood' ? CHECKIN_MOOD_XP : CHECKIN_BODY_XP;
}

export interface CheckInLevel {
  level: number;
  /** Progress through the current level, 0-1. */
  progress: number;
  xpToNext: number;
}

export function getCheckInLevel(xp: number): CheckInLevel {
  return { level: getLevel(xp), progress: getLevelProgress(xp), xpToNext: getXpToNextLevel(xp) };
}

export interface CheckInStreak {
  /** Days in a row with a log, ending today, or yesterday when today has none yet. */
  current: number;
  best: number;
  doneToday: boolean;
  /** A streak is running but today has no log yet. */
  atRisk: boolean;
}

function getLoggedDays(events: readonly CheckInEvent[], dayCutoffHour: number): Set<string> {
  return new Set(events.map(event => toDateString(new Date(event.ts), dayCutoffHour)));
}

export function getCheckInStreak(
  events: readonly CheckInEvent[],
  now = Date.now(),
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): CheckInStreak {
  const days = getLoggedDays(events, dayCutoffHour);
  const today = toDateString(new Date(now), dayCutoffHour);
  const doneToday = days.has(today);

  let current = 0;
  let cursor = doneToday ? today : addDaysToDateString(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const day of sorted) {
    run = previous && addDaysToDateString(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return { current, best: Math.max(best, current), doneToday, atRisk: current > 0 && !doneToday };
}

export interface CheckInDay {
  date: string;
  /** One-letter weekday. */
  label: string;
  done: boolean;
  isToday: boolean;
  /** Emoji source of the day's last mood log, when there is one. */
  lastMood?: string;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The last `count` days ending today, oldest first. */
export function getCheckInDays(
  events: readonly CheckInEvent[],
  count: number,
  now = Date.now(),
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): CheckInDay[] {
  const today = toDateString(new Date(now), dayCutoffHour);
  const moodByDay = new Map<string, string>();
  const days = new Set<string>();
  for (const event of events) {
    const day = toDateString(new Date(event.ts), dayCutoffHour);
    days.add(day);
    if (event.kind === 'mood') moodByDay.set(day, event.value);
  }
  return Array.from({ length: count }, (_, index) => {
    const date = addDaysToDateString(today, index - (count - 1));
    const [year, month, day] = date.split('-').map(Number);
    return {
      date,
      label: WEEKDAY_LETTERS[new Date(year, month - 1, day).getDay()],
      done: days.has(date),
      isToday: date === today,
      lastMood: moodByDay.get(date),
    };
  });
}

/** Mood logs of the last `days` days counted per mood, most frequent first. */
export function getMoodMix(
  moodLogs: readonly MoodLog[],
  days: number,
  now = Date.now(),
): Array<{ mood: MoodId; count: number }> {
  const since = now - days * 24 * MS_PER_HOUR;
  const counts = new Map<MoodId, number>();
  for (const log of moodLogs) {
    if (log.ts >= since) counts.set(log.mood, (counts.get(log.mood) ?? 0) + 1);
  }
  return [...counts.entries()].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count);
}

/** True when the last log is older than `staleHours`, or there is none. */
export function isCheckInStale(lastTs: number | undefined, staleHours: number, now = Date.now()): boolean {
  return lastTs == null || now - lastTs > staleHours * MS_PER_HOUR;
}

/** "just now", "3 h ago", "Yesterday", "4 d ago". */
export function formatCheckInAgo(ts: number | undefined, now = Date.now()): string {
  if (ts == null) return 'Not logged yet';
  const minutes = Math.max(0, Math.round((now - ts) / 60000));
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} d ago`;
}

export interface CheckInNudgePlan {
  identifier: string;
  at: number;
  title: string;
  body: string;
  saver: boolean;
}

function slotTime(date: string, hour: number): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

/**
 * Nudges for the next few days: one at each chosen hour unless something was logged within `skipWithinHours`
 * before it, plus a streak-saver today when a streak is running and today has no log. Re-planned on every log.
 */
export function getCheckInNudgePlans(
  settings: CheckInSettings,
  events: readonly CheckInEvent[],
  now = Date.now(),
  dayCutoffHour = DEFAULT_DAY_CUTOFF_HOUR,
): CheckInNudgePlan[] {
  if (!settings.nudgesEnabled) return [];
  const streak = getCheckInStreak(events, now, dayCutoffHour);
  const lastTs = events.reduce((latest, event) => Math.max(latest, event.ts), 0);
  const today = toDateString(new Date(now), dayCutoffHour);
  const plans: CheckInNudgePlan[] = [];

  for (let offset = 0; offset < NUDGE_DAYS_AHEAD; offset++) {
    const date = addDaysToDateString(today, offset);
    const hours = [...new Set(settings.nudgeHours)]
      .filter(hour => hour >= MIN_NUDGE_HOUR && hour <= MAX_NUDGE_HOUR)
      .sort((a, b) => a - b);
    for (const hour of hours) {
      const at = slotTime(date, hour);
      if (at <= now || at - lastTs < settings.skipWithinHours * MS_PER_HOUR) continue;
      const showStreak = offset === 0 && streak.current > 0;
      plans.push({
        identifier: `${CHECKIN_NUDGE_ID_PREFIX}${at}`,
        at,
        title: showStreak ? `How are you feeling? 🔥 ${streak.current}` : 'How are you feeling?',
        body: lastTs > 0 ? `Last check-in ${formatCheckInAgo(lastTs, at)}.` : 'Tap how you feel right now.',
        saver: false,
      });
    }
  }

  if (settings.streakSaverEnabled && streak.atRisk) {
    const at = slotTime(today, Math.min(MAX_NUDGE_HOUR, settings.streakSaverHour));
    if (at > now && !plans.some(plan => Math.abs(plan.at - at) < MS_PER_HOUR)) {
      plans.push({
        identifier: `${CHECKIN_NUDGE_ID_PREFIX}saver:${at}`,
        at,
        title: `Keep your 🔥 ${streak.current}-day streak`,
        body: 'No check-in yet today. How are you feeling?',
        saver: true,
      });
    }
  }
  return plans.sort((a, b) => a.at - b.at);
}

export interface CheckInNotificationData {
  kind: typeof CHECKIN_NOTIFICATION_KIND;
}

export function isCheckInNotificationData(data: unknown): data is CheckInNotificationData {
  return data != null && typeof data === 'object' && (data as { kind?: unknown }).kind === CHECKIN_NOTIFICATION_KIND;
}

/** Mood chosen with a nudge button, or undefined for any other action (e.g. tapping the notification). */
export function parseCheckInAction(actionIdentifier: string): MoodId | undefined {
  return actionIdentifier.startsWith(CHECKIN_ACTION_PREFIX)
    ? actionIdentifier.slice(CHECKIN_ACTION_PREFIX.length)
    : undefined;
}
