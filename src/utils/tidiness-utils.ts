import type { BehaviorEntry } from '../types/behavior';
import type { TidyMark, TidyPlanSize, TidyRect, TidyRoom, TidySpot, TidyWeight } from '../types/tidiness';
import { Colors } from './colors';
import {
  clampLevel,
  getNeedLevelTone,
  NEED_LEARN_MAX_STEP,
  NEED_LEARN_MIN_GAP_MS,
  NEED_LEARN_WEIGHT,
} from './need-utils';

const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

/** Default plan size in square cells; the user can change it in Edit plan. */
export const TIDY_DEFAULT_PLAN_SIZE: TidyPlanSize = { cols: 12, rows: 8 };
export const TIDY_PLAN_MIN_SIDE = 4;
export const TIDY_PLAN_MAX_COLS = 24;
export const TIDY_PLAN_MAX_ROWS = 40;
export const TIDY_MIN_EMPTY_HOURS = 6;
export const TIDY_MAX_EMPTY_HOURS = 90 * HOURS_PER_DAY;
/** Same as other needs: below this a spot shows red. */
export const TIDY_LOW_LINE = 30;

/** Choices for "Gets messy in", in days. */
export const TIDY_MESSY_DAY_STEPS: readonly number[] = [1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 45, 60, 90];

export interface TidyCheckInLevel {
  label: string;
  emoji: string;
  level: number;
}

export const TIDY_CHECK_IN_LEVELS: readonly TidyCheckInLevel[] = [
  { label: 'Gross', emoji: '😖', level: 5 },
  { label: 'Messy', emoji: '😕', level: 25 },
  { label: 'Okay', emoji: '😐', level: 50 },
  { label: 'Tidy', emoji: '🙂', level: 75 },
  { label: 'Clean', emoji: '✨', level: 100 },
];

/** Bar colour for a level: green, amber, red (same tones as need bars). */
export function getTidyColor(level: number | undefined): string {
  if (level == null) return Colors.text.faint;
  const tone = getNeedLevelTone(level, TIDY_LOW_LINE);
  if (tone === 'craving') return Colors.type.undesirable;
  if (tone === 'low') return Colors.type.neutral;
  return Colors.type.desirable;
}

/** Tile tint on the floor plan for a level. */
export function getTidyTileColors(level: number | undefined): { bg: string; text: string } {
  if (level == null) return { bg: '#262626', text: Colors.text.secondary };
  const tone = getNeedLevelTone(level, TIDY_LOW_LINE);
  if (tone === 'craving') return { bg: '#3b1212', text: '#fecaca' };
  if (tone === 'low') return { bg: '#3a2a0a', text: '#fde68a' };
  return { bg: '#123b22', text: '#bbf7d0' };
}

export function formatTidyPercent(level: number | undefined): string {
  return level == null ? '–' : `${Math.round(level)}%`;
}

export const TIDY_WEIGHT_LABELS: Record<TidyWeight, string> = { 1: 'Low', 2: 'Normal', 3: 'High' };

/** Something that set a spot's level: a clean (log or ✓) or a check-in. */
export interface TidyEvent {
  ts: number;
  level: number;
  checkIn: boolean;
  /** Set when a behaviour log cleaned the spot. */
  behaviorId?: string;
  logId?: string;
  /** Set when the event is a tap on the spot (✓ or check-in), so it can be undone. */
  markId?: string;
}

export interface TidySpotState {
  spot: TidySpot;
  /** Undefined until the spot is cleaned or checked in once. */
  level?: number;
  /** The latest event, which the level decays from. */
  anchor?: TidyEvent;
  lastCleaned?: TidyEvent;
}

export function getSpotDecayPerHour(spot: Pick<TidySpot, 'emptyHours'>): number {
  return 100 / Math.max(TIDY_MIN_EMPTY_HOURS, spot.emptyHours);
}

/** Every clean and check-in of a spot, newest first. */
export function getSpotEvents(spot: TidySpot, marks: TidyMark[], behaviors: BehaviorEntry[]): TidyEvent[] {
  const events: TidyEvent[] = [];
  for (const mark of marks) {
    if (mark.spotId === spot.id) {
      events.push({ ts: mark.ts, level: mark.level, checkIn: mark.checkIn, markId: mark.id });
    }
  }
  if (spot.behaviorIds.length > 0) {
    const linked = new Set(spot.behaviorIds);
    for (const behavior of behaviors) {
      if (!linked.has(behavior.id)) continue;
      for (const log of behavior.logs) {
        if (log.batchBehaviorId != null) continue;
        const ts = log.endTimestamp ?? log.timestamp;
        // Logs from before the spot was made don't count: the user rated it when adding it.
        if (ts < spot.createdAt) continue;
        events.push({ ts, level: 100, checkIn: false, behaviorId: behavior.id, logId: log.id });
      }
    }
  }
  return events.sort((a, b) => b.ts - a.ts);
}

/** Level of a spot at `now`: the last clean or check-in, minus how messy it got since. */
export function getSpotState(
  spot: TidySpot,
  marks: TidyMark[],
  behaviors: BehaviorEntry[],
  now: number,
): TidySpotState {
  const events = getSpotEvents(spot, marks, behaviors).filter(event => event.ts <= now);
  const anchor = events[0];
  if (!anchor) return { spot };
  const level = clampLevel(anchor.level - (getSpotDecayPerHour(spot) * (now - anchor.ts)) / MS_PER_HOUR);
  return { spot, level, anchor, lastCleaned: events.find(event => !event.checkIn) };
}

/**
 * New "hours to a mess" after a check-in, the same rule as other needs: the rate moves a quarter
 * of the way toward what the check-in implies, at most 15% per check-in.
 */
export function learnSpotEmptyHours(
  emptyHours: number,
  anchor: Pick<TidyEvent, 'ts' | 'level'> | undefined,
  checkIn: { ts: number; level: number },
): number {
  if (!anchor) return emptyHours;
  const elapsedMs = checkIn.ts - anchor.ts;
  if (elapsedMs < NEED_LEARN_MIN_GAP_MS) return emptyHours;
  const rate = 100 / emptyHours;
  const implied = Math.max(0, anchor.level - checkIn.level) / (elapsedMs / MS_PER_HOUR);
  const target = rate + NEED_LEARN_WEIGHT * (implied - rate);
  const next = Math.min(rate * (1 + NEED_LEARN_MAX_STEP), Math.max(rate * (1 - NEED_LEARN_MAX_STEP), target));
  const hours = 100 / next;
  return Math.round(Math.min(TIDY_MAX_EMPTY_HOURS, Math.max(TIDY_MIN_EMPTY_HOURS, hours)) * 10) / 10;
}

export interface TidyOverall {
  /** Weighted average of the spots with a level; undefined when none has one. */
  level?: number;
  /**
   * Hours from 100% to 0% at today's pace (weighted average of the spots still above 0%), so the
   * Tidiness need's "Low in ~" and nudges work unchanged. Undefined when nothing is decaying.
   */
  emptyHours?: number;
}

export function getOverallTidiness(states: TidySpotState[]): TidyOverall {
  let weight = 0;
  let sum = 0;
  let decay = 0;
  for (const state of states) {
    if (state.level == null) continue;
    weight += state.spot.weight;
    sum += state.spot.weight * state.level;
    if (state.level > 0) decay += state.spot.weight * getSpotDecayPerHour(state.spot);
  }
  if (weight === 0) return {};
  const rate = decay / weight;
  return { level: sum / weight, emptyHours: rate > 0 ? 100 / rate : undefined };
}

/** The spot with the lowest level. */
export function getMessiestSpot(states: TidySpotState[]): TidySpotState | undefined {
  let worst: TidySpotState | undefined;
  for (const state of states) {
    if (state.level == null) continue;
    if (!worst || state.level < (worst.level ?? 100)) worst = state;
  }
  return worst;
}

/** The spot still above the low line that will drop below it first, and when. */
export function getNextLowSpot(states: TidySpotState[], now: number): { state: TidySpotState; at: number } | undefined {
  let next: { state: TidySpotState; at: number } | undefined;
  for (const state of states) {
    if (state.level == null || state.level <= TIDY_LOW_LINE) continue;
    const at = now + ((state.level - TIDY_LOW_LINE) / getSpotDecayPerHour(state.spot)) * MS_PER_HOUR;
    if (!next || at < next.at) next = { state, at };
  }
  return next;
}

/** Weighted level of one room's spots. */
export function getRoomLevel(roomId: string, states: TidySpotState[]): number | undefined {
  return getOverallTidiness(states.filter(state => state.spot.roomId === roomId)).level;
}

export function formatMessyIn(emptyHours: number): string {
  if (emptyHours < 36) return `~${Math.round(emptyHours)} h`;
  const days = Math.round(emptyHours / HOURS_PER_DAY);
  return `~${days} day${days === 1 ? '' : 's'}`;
}

/** Short "how long ago", e.g. "3 d ago". */
export function formatTidyAgo(ts: number | undefined, now: number): string {
  if (ts == null) return 'never';
  const ms = Math.max(0, now - ts);
  if (ms < MS_PER_HOUR) return 'just now';
  const hours = ms / MS_PER_HOUR;
  if (hours < HOURS_PER_DAY) return `${Math.floor(hours)} h ago`;
  return `${Math.floor(hours / HOURS_PER_DAY)} d ago`;
}

/** "in ~9 h" / "in ~3 days" until a time. */
export function formatTidyIn(at: number, now: number): string {
  const hours = Math.max(0, at - now) / MS_PER_HOUR;
  if (hours < 1) return 'within the hour';
  if (hours < 36) return `in ~${Math.round(hours)} h`;
  return `in ~${Math.round(hours / HOURS_PER_DAY)} days`;
}

/** Nearest step of TIDY_MESSY_DAY_STEPS for a number of hours. */
export function getMessyDayStepIndex(emptyHours: number): number {
  const days = emptyHours / HOURS_PER_DAY;
  let best = 0;
  TIDY_MESSY_DAY_STEPS.forEach((step, index) => {
    if (Math.abs(step - days) < Math.abs(TIDY_MESSY_DAY_STEPS[best] - days)) best = index;
  });
  return best;
}

// ── Floor plan ──

/** Keeps a tile on the grid and inside the plan. */
export function clampRect(rect: TidyRect, size: TidyPlanSize): TidyRect {
  const w = Math.max(1, Math.min(size.cols, Math.round(rect.w)));
  const h = Math.max(1, Math.min(size.rows, Math.round(rect.h)));
  const x = Math.max(0, Math.min(size.cols - w, Math.round(rect.x)));
  const y = Math.max(0, Math.min(size.rows - h, Math.round(rect.y)));
  return { x, y, w, h };
}

/** Plan width and height kept within limits. */
export function clampPlanSize(size: TidyPlanSize): TidyPlanSize {
  return {
    cols: Math.max(TIDY_PLAN_MIN_SIDE, Math.min(TIDY_PLAN_MAX_COLS, Math.round(size.cols))),
    rows: Math.max(TIDY_PLAN_MIN_SIDE, Math.min(TIDY_PLAN_MAX_ROWS, Math.round(size.rows))),
  };
}

/** A plan big enough for every tile (for plans saved before the size could be set). */
export function getFittingPlanSize(rooms: TidyRoom[], size: TidyPlanSize = TIDY_DEFAULT_PLAN_SIZE): TidyPlanSize {
  const right = rooms.reduce((max, room) => Math.max(max, room.rect.x + room.rect.w), 0);
  const bottom = rooms.reduce((max, room) => Math.max(max, room.rect.y + room.rect.h), 0);
  return clampPlanSize({ cols: Math.max(size.cols, right), rows: Math.max(size.rows, bottom) });
}

/** A spot for a new room tile: below every tile, or at the bottom edge when the plan is full. */
export function getNewRoomRect(rooms: TidyRoom[], size: TidyPlanSize): TidyRect {
  const bottom = rooms.reduce((max, room) => Math.max(max, room.rect.y + room.rect.h), 0);
  return clampRect({ x: 0, y: bottom, w: 4, h: 3 }, size);
}

/**
 * Where each spot's dot sits inside its room tile, 0-1 on each axis. Spots without a pin are
 * spread along a row near the bottom of the tile.
 */
export function getSpotPins(spots: TidySpot[]): Map<string, { x: number; y: number }> {
  const pins = new Map<string, { x: number; y: number }>();
  const byRoom = new Map<string, TidySpot[]>();
  for (const spot of spots) {
    if (spot.pin) pins.set(spot.id, spot.pin);
    else byRoom.set(spot.roomId, [...(byRoom.get(spot.roomId) ?? []), spot]);
  }
  for (const unpinned of byRoom.values()) {
    unpinned.forEach((spot, index) => {
      const columns = Math.min(4, unpinned.length);
      const row = Math.floor(index / columns);
      pins.set(spot.id, {
        x: (0.5 + (index % columns)) / columns,
        y: Math.max(0.15, 0.82 - row * 0.2),
      });
    });
  }
  return pins;
}

// ── Starter rooms ──

export interface TidyStarterSpot {
  name: string;
  emoji: string;
  days: number;
  weight: TidyWeight;
  /** Existing behaviours whose name matches are linked automatically. */
  match?: RegExp;
}

export interface TidyStarterRoom {
  name: string;
  emoji: string;
  rect: TidyRect;
  spots: TidyStarterSpot[];
}

export const TIDY_STARTER_ROOMS: readonly TidyStarterRoom[] = [
  {
    name: 'Kitchen',
    emoji: '🍳',
    rect: { x: 0, y: 0, w: 5, h: 4 },
    spots: [
      { name: 'Sink', emoji: '🚰', days: 2, weight: 3, match: /dish|sink/i },
      { name: 'Counter', emoji: '🧽', days: 3, weight: 2, match: /counter|wipe/i },
      { name: 'Stove', emoji: '🔥', days: 7, weight: 2, match: /stove|hob|cooker/i },
      { name: 'Fridge', emoji: '🧊', days: 14, weight: 1, match: /fridge/i },
    ],
  },
  {
    name: 'Bedroom',
    emoji: '🛏️',
    rect: { x: 5, y: 0, w: 7, h: 4 },
    spots: [
      { name: 'Bed sheets', emoji: '🛏️', days: 7, weight: 2, match: /sheet|bedding|blanket|make (the )?bed/i },
      { name: 'Nightstand', emoji: '🪔', days: 10, weight: 1 },
    ],
  },
  {
    name: 'Bathroom',
    emoji: '🛁',
    rect: { x: 0, y: 4, w: 4, h: 4 },
    spots: [
      { name: 'Toilet', emoji: '🚽', days: 5, weight: 2, match: /toilet|bathroom/i },
      { name: 'Shower', emoji: '🚿', days: 7, weight: 1, match: /clean.*shower|shower.*clean/i },
    ],
  },
  {
    name: 'Living room',
    emoji: '🛋️',
    rect: { x: 4, y: 4, w: 5, h: 4 },
    spots: [
      { name: 'Floor', emoji: '🧹', days: 4, weight: 2, match: /vacuum|sweep|mop|floor/i },
      { name: 'Couch', emoji: '🛋️', days: 5, weight: 1 },
    ],
  },
  {
    name: 'Desk',
    emoji: '💻',
    rect: { x: 9, y: 4, w: 3, h: 2 },
    spots: [{ name: 'Desk', emoji: '💻', days: 3, weight: 2, match: /desk/i }],
  },
  {
    name: 'Laundry',
    emoji: '🧺',
    rect: { x: 9, y: 6, w: 3, h: 2 },
    spots: [{ name: 'Laundry pile', emoji: '🧺', days: 4, weight: 2, match: /laundry|washing/i }],
  },
];

/** Ids of active behaviours whose names match a starter spot. */
export function matchStarterBehaviors(spot: TidyStarterSpot, behaviors: BehaviorEntry[]): string[] {
  const { match } = spot;
  if (!match) return [];
  return behaviors.filter(behavior => behavior.archivedAt == null && match.test(behavior.name)).map(b => b.id);
}

export function daysToHours(days: number): number {
  return days * HOURS_PER_DAY;
}

// ── Tidiness need ──

export interface TidinessNeedOverride {
  level?: number;
  /** Today's pace as the need's "hours to empty", for "Low in ~" and nudges. */
  emptyHours?: number;
  lastRefillAt?: number;
  lastRefillBehaviorId?: string;
  /** The messiest spot's cleaning behaviours, for nudge buttons. */
  refillBehaviorIds: string[];
}

/**
 * Once spots exist, the Tidiness need comes from them (weighted average) instead of its own
 * refills. Undefined while there are no spots, so the plain need keeps working.
 */
export function getTidinessNeedOverride(
  spots: TidySpot[],
  marks: TidyMark[],
  behaviors: BehaviorEntry[],
  now: number,
): TidinessNeedOverride | undefined {
  if (spots.length === 0) return undefined;
  const states = spots.map(spot => getSpotState(spot, marks, behaviors, now));
  const overall = getOverallTidiness(states);
  let last: TidyEvent | undefined;
  for (const state of states) {
    if (state.lastCleaned && (!last || state.lastCleaned.ts > last.ts)) last = state.lastCleaned;
  }
  return {
    level: overall.level,
    emptyHours: overall.emptyHours,
    lastRefillAt: last?.ts,
    lastRefillBehaviorId: last?.behaviorId,
    refillBehaviorIds: getMessiestSpot(states)?.spot.behaviorIds ?? [],
  };
}
