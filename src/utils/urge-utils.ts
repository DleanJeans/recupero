import type { CravingLog, UrgeLevel } from '../types/craving';
import type { CopingUrge } from '../types/urge';

const MS_PER_HOUR = 3_600_000;
export const URGE_DEFAULT_LINE = 70;
export const URGE_DEFAULT_RESIST_DROP = 40;
/** Full-in time when there are too few logs to learn from. */
export const URGE_DEFAULT_FULL_IN_HOURS = 24;
export const URGE_MIN_FULL_IN_HOURS = 1;
export const URGE_MAX_FULL_IN_HOURS = 24 * 60;
/** How many of the most recent gaps between logs the learned rate looks at. */
const LEARN_GAPS = 10;
/** Logs closer together than this count as one session (e.g. several games in a row). */
const SESSION_GAP_MS = 30 * 60_000;

export function createCopingUrge(behaviorId: string, now: number): CopingUrge {
  return { behaviorId, addedAt: now, line: URGE_DEFAULT_LINE, resistDrop: URGE_DEFAULT_RESIST_DROP };
}

/** Median gap between recent sessions of the behaviour, in hours. Undefined with fewer than two sessions. */
export function getLearnedFullInHours(logTimestamps: number[]): number | undefined {
  const sorted = [...logTimestamps].sort((a, b) => a - b);
  const sessions: number[] = [];
  for (const ts of sorted) {
    if (sessions.length === 0 || ts - sessions[sessions.length - 1] > SESSION_GAP_MS) sessions.push(ts);
    else sessions[sessions.length - 1] = ts;
  }
  if (sessions.length < 2) return undefined;
  const gaps = sessions
    .slice(1)
    .map((ts, i) => ts - sessions[i])
    .slice(-LEARN_GAPS)
    .sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return clampFullInHours(median / MS_PER_HOUR);
}

function clampFullInHours(hours: number): number {
  return Math.min(URGE_MAX_FULL_IN_HOURS, Math.max(URGE_MIN_FULL_IN_HOURS, hours));
}

export function getUrgeFullInHours(urge: CopingUrge, logTimestamps: number[]): { hours: number; learned: boolean } {
  if (urge.fullInHours != null) return { hours: clampFullInHours(urge.fullInHours), learned: false };
  return { hours: getLearnedFullInHours(logTimestamps) ?? URGE_DEFAULT_FULL_IN_HOURS, learned: true };
}

export interface UrgeState {
  /** 0-100. */
  level: number;
  /** Percentage points per hour. */
  perHour: number;
  fullInHours: number;
  learned: boolean;
  /** When the bar reaches the line; undefined when it already has. */
  crossesLineAt?: number;
  lastDoneAt?: number;
}

type UrgeEvent =
  | { ts: number; kind: 'reset' }
  | { ts: number; kind: 'set'; level: number }
  | { ts: number; kind: 'drop' };

/**
 * Replays the urge from the last log: it rises at a constant rate, an urge rating (1-5) sets it to rating x 20,
 * a craving that ended without giving in lowers it by `resistDrop`, and giving in resets it to 0.
 */
export function getUrgeState(
  urge: CopingUrge,
  logTimestamps: number[],
  cravings: CravingLog[],
  now: number,
): UrgeState {
  const { hours, learned } = getUrgeFullInHours(urge, logTimestamps);
  const perHour = 100 / hours;
  const past = logTimestamps.filter(ts => ts <= now);
  const lastDoneAt = past.length ? Math.max(...past) : undefined;
  let level = 0;
  let t = lastDoneAt ?? urge.addedAt;

  const events: UrgeEvent[] = [];
  for (const craving of cravings) {
    if (craving.behaviorId !== urge.behaviorId) continue;
    for (const rating of craving.ratings)
      if (rating.ts > t && rating.ts <= now) events.push(setEvent(rating.ts, rating.level));
    const end = craving.endedAt;
    if (craving.outcome == null || end == null || end <= t || end > now) continue;
    events.push(craving.outcome === 'gaveIn' ? { ts: end, kind: 'reset' } : { ts: end, kind: 'drop' });
  }
  events.sort((a, b) => a.ts - b.ts);

  const rise = (to: number) => {
    level = Math.min(100, level + ((to - t) / MS_PER_HOUR) * perHour);
    t = to;
  };
  for (const event of events) {
    rise(event.ts);
    if (event.kind === 'reset') level = 0;
    else if (event.kind === 'set') level = event.level;
    else level = Math.max(0, level - urge.resistDrop);
  }
  rise(Math.max(t, now));

  const crossesLineAt = level >= urge.line ? undefined : now + ((urge.line - level) / perHour) * MS_PER_HOUR;
  return { level, perHour, fullInHours: hours, learned, crossesLineAt, lastDoneAt };
}

function setEvent(ts: number, rating: UrgeLevel): UrgeEvent {
  return { ts, kind: 'set', level: rating * 20 };
}

/** Urge on the 1-5 scale used by Ride it out. */
export function toUrgeLevel(level: number): UrgeLevel {
  return Math.min(5, Math.max(1, Math.ceil(level / 20))) as UrgeLevel;
}

export type UrgeTone = 'past' | 'near' | 'calm';

export function getUrgeTone(level: number, line: number): UrgeTone {
  if (level >= line) return 'past';
  if (level >= line - 25) return 'near';
  return 'calm';
}

/** Short label for a full-in time: "20h", "3d", "2w". */
export function formatFullIn(hours: number): string {
  if (hours < 48) return `${Math.round(hours)}h`;
  if (hours < 24 * 14) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours / 168)}w`;
}

/** When the bar will reach the line, as a short phrase: "~2:30 PM", "Thu ~11 PM", "in 9d". */
export function formatCrossesAt(ts: number, now: number, formatClock: (ts: number) => string): string {
  const hours = (ts - now) / MS_PER_HOUR;
  const sameDay = new Date(ts).toDateString() === new Date(now).toDateString();
  if (sameDay) return `~${formatClock(ts)}`;
  if (hours < 24 * 6) {
    const day = new Date(ts).toLocaleDateString('en-US', { weekday: 'short' });
    return `${day} ~${formatClock(ts)}`;
  }
  return `in ${formatFullIn(hours)}`;
}

/** Urges sorted for the list: past the line first, then by level. */
export function sortUrges<T extends { state: UrgeState; urge: CopingUrge }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.state.level / b.urge.line - a.state.level / a.urge.line);
}
