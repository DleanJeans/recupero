import type { NeedId } from '../types/need';
import { clampLevel, compareNeedEvents, NEED_UNKNOWN_START_LEVEL, type NeedEvent } from './need-utils';

const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** A need's "hours to empty" from `ts` until the next point. */
export interface NeedRatePoint {
  ts: number;
  emptyHours: number;
}

export interface NeedLevelPoint {
  ts: number;
  level: number;
}

/** The rate in force at `ts`: the last point at or before it, else `fallback` (the default rate). */
export function getEmptyHoursAt(history: readonly NeedRatePoint[], fallback: number, ts: number): number {
  let hours = fallback;
  for (const point of history) {
    if (point.ts > ts) break;
    hours = point.emptyHours;
  }
  return hours;
}

/** Level at `ts` read off a point list (straight lines between points; after a jump, its end). */
function levelAtPoint(points: readonly NeedLevelPoint[], ts: number): number | undefined {
  let i = -1;
  while (i + 1 < points.length && points[i + 1].ts <= ts) i++;
  if (i < 0) return undefined;
  const a = points[i];
  const b = points[i + 1];
  if (!b || a.ts === ts) return a.level;
  return a.level + ((b.level - a.level) * (ts - a.ts)) / (b.ts - a.ts);
}

/**
 * Draws a duration refill (sleep) as a straight rise from where the level was when it started to
 * where it is right after it ends, instead of decay then a jump at the end. Both ends match the
 * level model; a refill with another event inside it stays a jump, since the ramp would hide it.
 */
function rampDurationRefills(points: NeedLevelPoint[], sorted: readonly NeedEvent[]): NeedLevelPoint[] {
  let out = points;
  for (const event of sorted) {
    if (event.kind !== 'add' || event.startTs == null || event.startTs >= event.ts) continue;
    const { startTs, ts: endTs } = event;
    if (sorted.some(other => other !== event && other.ts > startTs && other.ts <= endTs)) continue;
    const startLevel = levelAtPoint(out, startTs);
    const atEnd = out.filter(point => point.ts === endTs);
    if (startLevel == null || atEnd.length === 0) continue;
    const endLevel = atEnd[atEnd.length - 1].level;
    const before = out.filter(point => point.ts <= startTs);
    const rampStart = before[before.length - 1]?.ts === startTs ? [] : [{ ts: startTs, level: startLevel }];
    out = [...before, ...rampStart, { ts: endTs, level: endLevel }, ...out.filter(point => point.ts > endTs)];
  }
  return out;
}

/**
 * Levels from `from` to `to`: a sample every `stepMs`, plus a point either side of each event so
 * refills show as straight jumps, except duration refills (sleep), which rise across their length.
 * Nothing is drawn before the first known event. Each stretch decays at the rate in force then.
 */
export function replayNeedLevels(
  events: readonly NeedEvent[],
  emptyHoursAt: (ts: number) => number,
  from: number,
  to: number,
  stepMs: number,
): NeedLevelPoint[] {
  const sorted = events.filter(event => event.ts <= to).sort(compareNeedEvents);
  if (sorted.length === 0 || to <= from) return [];
  // A sleep that started before the range but ends in it needs its start level, so draw from there.
  let drawFrom = from;
  for (const event of sorted) {
    if (event.kind === 'add' && event.startTs != null && event.ts >= from && event.startTs < drawFrom) {
      drawFrom = from - Math.ceil((from - event.startTs) / stepMs) * stepMs;
    }
  }
  const points: NeedLevelPoint[] = [];
  let level = NEED_UNKNOWN_START_LEVEL;
  let t = sorted[0].ts;
  let nextSample = drawFrom;

  const decayTo = (target: number) => {
    while (t < target) {
      const next = Math.min(target, t + stepMs);
      level = clampLevel(level - ((100 / emptyHoursAt(t)) * (next - t)) / MS_PER_HOUR);
      t = next;
    }
  };
  const sampleUntil = (limit: number) => {
    while (nextSample < limit && nextSample <= to) {
      if (nextSample >= t) {
        decayTo(nextSample);
        points.push({ ts: nextSample, level });
      }
      nextSample += stepMs;
    }
  };

  for (const event of sorted) {
    sampleUntil(event.ts);
    decayTo(event.ts);
    if (event.ts >= drawFrom) points.push({ ts: event.ts, level });
    level = event.kind === 'add' ? clampLevel(level + event.amount) : clampLevel(event.level);
    if (event.ts >= drawFrom) points.push({ ts: event.ts, level });
  }
  sampleUntil(to + 1);
  decayTo(to);
  if (points.length === 0 || points[points.length - 1].ts < to) points.push({ ts: to, level });

  const ramped = rampDurationRefills(points, sorted);
  if (drawFrom === from) return ramped;
  const inRange = ramped.filter(point => point.ts >= from);
  const startLevel = levelAtPoint(ramped, from);
  if (startLevel != null && inRange[0]?.ts !== from) inRange.unshift({ ts: from, level: startLevel });
  return inRange;
}

export interface NeedRangeStats {
  /** Time-weighted average level over the known part of the range. */
  avg?: number;
  min?: number;
  max?: number;
  /** Time spent below `lowLine`. */
  lowMs: number;
  /** Time the level was known. */
  knownMs: number;
}

/** Average, lowest, highest and time below the line, between `from` and `to`. */
export function getNeedRangeStats(
  points: readonly NeedLevelPoint[],
  lowLine: number,
  from: number,
  to: number,
): NeedRangeStats {
  let weighted = 0;
  let knownMs = 0;
  let lowMs = 0;
  let min: number | undefined;
  let max: number | undefined;
  const note = (level: number) => {
    min = min == null ? level : Math.min(min, level);
    max = max == null ? level : Math.max(max, level);
  };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const start = Math.max(from, a.ts);
    const end = Math.min(to, b.ts);
    if (end < start) continue;
    const at = (ts: number) =>
      b.ts === a.ts ? b.level : a.level + ((b.level - a.level) * (ts - a.ts)) / (b.ts - a.ts);
    const startLevel = at(start);
    const endLevel = at(end);
    note(startLevel);
    note(endLevel);
    if (end === start) continue;
    const mid = (startLevel + endLevel) / 2;
    weighted += mid * (end - start);
    knownMs += end - start;
    if (mid < lowLine) lowMs += end - start;
  }
  if (points.length === 1 && points[0].ts >= from && points[0].ts <= to) note(points[0].level);
  return { avg: knownMs > 0 ? weighted / knownMs : undefined, min, max, lowMs, knownMs };
}

export interface NeedDayBand extends NeedRangeStats {
  start: number;
  end: number;
}

/** One band per day between consecutive `dayStarts` (n+1 boundaries make n days). */
export function getNeedDayBands(
  points: readonly NeedLevelPoint[],
  lowLine: number,
  dayStarts: readonly number[],
): NeedDayBand[] {
  const bands: NeedDayBand[] = [];
  for (let i = 0; i + 1 < dayStarts.length; i++) {
    const start = dayStarts[i];
    const end = dayStarts[i + 1];
    bands.push({ start, end, ...getNeedRangeStats(points, lowLine, start, end) });
  }
  return bands;
}

/** Refills (not check-ins) between `from` and `to`. */
export function countRefills(events: readonly NeedEvent[], from: number, to: number): number {
  return events.filter(event => event.ts >= from && event.ts <= to && !(event.kind === 'set' && event.checkIn === true))
    .length;
}

/** Sample step that keeps a chart to a few hundred points. */
export function getChartStepMs(rangeMs: number): number {
  if (rangeMs <= MS_PER_DAY) return 10 * 60_000;
  if (rangeMs <= 3 * MS_PER_DAY) return 20 * 60_000;
  if (rangeMs <= 7 * MS_PER_DAY) return 45 * 60_000;
  return 2 * MS_PER_HOUR;
}

/** Points for "How it learned": the default, then each learned rate in order. */
export function getRateLearningPoints(
  history: readonly NeedRatePoint[],
  defaultHours: number,
): Array<{ index: number; ts?: number; emptyHours: number }> {
  return [
    { index: 0, emptyHours: defaultHours },
    // A point at ts 0 is a rate learned before history was kept, so it has no date.
    ...history.map((point, i) => ({
      index: i + 1,
      ts: point.ts > 0 ? point.ts : undefined,
      emptyHours: point.emptyHours,
    })),
  ];
}

export type NeedHistoryRange = 'day' | 'week' | 'month';

export const NEED_HISTORY_RANGE_DAYS: Record<NeedHistoryRange, number> = { day: 1, week: 7, month: 30 };

/** Day boundaries for a range ending with the day that starts at `lastDayStart`, `offset` periods back. */
export function getHistoryDayStarts(
  lastDayStart: number,
  days: number,
  offset: number,
  addDays: (ts: number, days: number) => number,
): number[] {
  const end = addDays(lastDayStart, 1 - offset * days);
  const starts: number[] = [];
  for (let i = days; i >= 0; i--) starts.push(addDays(end, -i));
  return starts;
}

export function emptyRateHistory(): Record<NeedId, NeedRatePoint[]> {
  return { hunger: [], thirst: [], hygiene: [], energy: [] };
}

/** Quiet hours (23:00–07:00 local) that overlap `from`–`to`, for shading charts. */
export function getQuietWindows(
  from: number,
  to: number,
  startHour = 23,
  endHour = 7,
): Array<{ from: number; to: number }> {
  const windows: Array<{ from: number; to: number }> = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - 1);
  while (day.getTime() < to) {
    const start = new Date(day);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    end.setHours(endHour, 0, 0, 0);
    const a = Math.max(from, start.getTime());
    const b = Math.min(to, end.getTime());
    if (b > a) windows.push({ from: a, to: b });
    day.setDate(day.getDate() + 1);
  }
  return windows;
}

/** Short hour label for chart axes: "6a" / "12p" (12h) or "06" (24h). */
export function formatAxisHour(ts: number, hour12: boolean): string {
  const hour = new Date(ts).getHours();
  if (!hour12) return String(hour).padStart(2, '0');
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'a' : 'p'}`;
}

/** Evenly spaced axis ticks: every `everyMs` from the first boundary at or after `from`. */
export function getAxisTicks(from: number, to: number, everyMs: number, alignToLocalDay = true): number[] {
  const first = new Date(from);
  if (alignToLocalDay) first.setHours(0, 0, 0, 0);
  let t = first.getTime();
  while (t < from) t += everyMs;
  const ticks: number[] = [];
  for (; t <= to; t += everyMs) ticks.push(t);
  return ticks;
}

/** Same local time `days` later (handles daylight saving). */
export function addLocalDays(ts: number, days: number): number {
  const date = new Date(ts);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Line colour for each need when several are drawn together. */
export const NEED_CHART_COLORS: Record<NeedId, string> = {
  hunger: '#f59e0b',
  thirst: '#60a5fa',
  hygiene: '#2dd4bf',
  energy: '#a3e635',
};

/** "+45%", "Full" or "Check-in 25%" for an event dot. */
export function describeNeedEvent(event: NeedEvent): string {
  if (event.kind === 'add') return `+${Math.round(event.amount)}%`;
  if (event.checkIn) return `Check-in ${Math.round(event.level)}%`;
  return event.level >= 100 ? 'Full' : `Set to ${Math.round(event.level)}%`;
}

/** "2h 50m" of time spent low, or "0m". */
export function formatLowTime(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return '0m';
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Labels under day columns: weekday initials for a week, the date every 5th day for a month. */
export function getHistoryDayLabels(dayStarts: readonly number[], range: NeedHistoryRange): string[] {
  const days = dayStarts.slice(0, -1);
  if (range === 'week') return days.map(ts => WEEKDAY_INITIALS[new Date(ts).getDay()]);
  return days.map((ts, i) => (i % 5 === 0 ? String(new Date(ts).getDate()) : ''));
}
