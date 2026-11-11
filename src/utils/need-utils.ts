import type { BehaviorEntry, Category, LogSleepDetails, MetadataField } from '../types/behavior';
import type { NeedCheckIn, NeedConfig, NeedId, NeedMetadataSource, NeedRefill } from '../types/need';

const MS_PER_HOUR = 3_600_000;

export const NEED_IDS: readonly NeedId[] = ['hunger', 'thirst', 'hygiene', 'energy'];

export interface NeedInfo {
  id: NeedId;
  emoji: string;
  label: string;
  /** "How hungry are you?" */
  question: string;
  /** Check-in choices from empty to full. */
  checkIns: ReadonlyArray<{ label: string; level: number }>;
  /** Body sensations that count as a check-in at the craving line. */
  bodySensations: readonly string[];
  /** Behaviour names that probably refill this need, offered as suggestions. */
  suggest: RegExp;
}

const checkInLevels = (labels: [string, string, string, string, string]) =>
  labels.map((label, index) => ({ label, level: [5, 25, 45, 70, 95][index] }));

export const NEED_INFO: Record<NeedId, NeedInfo> = {
  hunger: {
    id: 'hunger',
    emoji: '🍽️',
    label: 'Hunger',
    question: 'How hungry are you?',
    checkIns: checkInLevels(['Starving', 'Hungry', 'Peckish', 'Satisfied', 'Full']),
    bodySensations: ['hungry'],
    suggest: /breakfast|lunch|dinner|meal|snack|eat/i,
  },
  thirst: {
    id: 'thirst',
    emoji: '💧',
    label: 'Thirst',
    question: 'How thirsty are you?',
    checkIns: checkInLevels(['Parched', 'Thirsty', 'Could drink', 'Fine', 'Quenched']),
    bodySensations: ['thirsty'],
    suggest: /water|tea|coffee|juice|drink|milk|soda|coke|smoothie/i,
  },
  hygiene: {
    id: 'hygiene',
    emoji: '🧼',
    label: 'Hygiene',
    question: 'How clean do you feel?',
    checkIns: checkInLevels(['Gross', 'Grubby', 'Okay', 'Clean', 'Fresh']),
    bodySensations: [],
    suggest: /shower|bath|wash|brush|teeth|shave/i,
  },
  energy: {
    id: 'energy',
    emoji: '⚡',
    label: 'Energy',
    question: 'How much energy do you have?',
    checkIns: checkInLevels(['Exhausted', 'Tired', 'Okay', 'Awake', 'Energised']),
    bodySensations: ['tired', 'sleepy'],
    // Word boundaries so "Napa cabbage" or "Restaurant" don't count.
    suggest: /\b(sleep|nap|rest)\b/i,
  },
};

export const DEFAULT_NEED_CONFIGS: Record<NeedId, NeedConfig> = {
  hunger: { enabled: true, emptyHours: 8, cravingLine: 30, nudgeLine: 15, refills: {}, learnedFrom: 0 },
  thirst: { enabled: true, emptyHours: 5, cravingLine: 30, nudgeLine: 15, refills: {}, learnedFrom: 0 },
  hygiene: { enabled: true, emptyHours: 36, cravingLine: 30, nudgeLine: 10, refills: {}, learnedFrom: 0 },
  energy: { enabled: true, emptyHours: 16, cravingLine: 25, nudgeLine: 10, refills: {}, learnedFrom: 0 },
};

/** Calories that take Hunger from empty to full, until the user changes it in Settings. */
export const DEFAULT_HUNGER_FULL_KCAL = 800;
/** Logs older than this don't affect the current level. */
export const NEED_LOOKBACK_MS = 4 * 24 * MS_PER_HOUR;
/** Level assumed before the first known event in the lookback window. */
export const NEED_UNKNOWN_START_LEVEL = 50;
/** Each check-in moves the rate this far toward the rate it implies… */
export const NEED_LEARN_WEIGHT = 0.25;
/** …but never more than this fraction per check-in. */
export const NEED_LEARN_MAX_STEP = 0.15;
/** Check-ins this soon after the last event are too noisy to learn from. */
export const NEED_LEARN_MIN_GAP_MS = 0.5 * MS_PER_HOUR;
export const NEED_MIN_EMPTY_HOURS = 1;
export const NEED_MAX_EMPTY_HOURS = 240;
export const QUIET_START_HOUR = 23;
export const QUIET_END_HOUR = 7;

export function clampLevel(level: number): number {
  return Math.min(100, Math.max(0, level));
}

/** Percentage points lost per hour. */
export function getDecayPerHour(config: Pick<NeedConfig, 'emptyHours'>): number {
  return 100 / config.emptyHours;
}

/** A metadata field that looks like calories, used when Hunger has no source set. */
export function findCalorieField(categories: Category[]): MetadataField | undefined {
  for (const category of categories) {
    const field = category.metadataFields?.find(
      item => /kcal|cal/i.test(item.unit ?? '') || /calor|kcal/i.test(item.label),
    );
    if (field) return field;
  }
  return undefined;
}

export function getNeedMetadataSource(
  needId: NeedId,
  config: NeedConfig,
  categories: Category[],
): NeedMetadataSource | undefined {
  if (config.metadataSource === null) return undefined;
  const withCategories = (fieldKey: string, fullAmount: number): NeedMetadataSource => ({
    fieldKey,
    fullAmount,
    categoryIds: categories
      .filter(category => category.metadataFields?.some(field => field.key === fieldKey))
      .map(category => category.id),
  });
  if (config.metadataSource) return withCategories(config.metadataSource.fieldKey, config.metadataSource.fullAmount);
  if (needId !== 'hunger') return undefined;
  const field = findCalorieField(categories);
  return field ? withCategories(field.key, DEFAULT_HUNGER_FULL_KCAL) : undefined;
}

/** `logId` is the refill's log, or the check-in's id for check-ins. */
export type NeedEvent =
  | { ts: number; kind: 'add'; amount: number; behaviorId: string; logId?: string }
  | { ts: number; kind: 'set'; level: number; behaviorId?: string; checkIn?: boolean; logId?: string };

/** Share of time asleep spent in deep + REM sleep that counts as a normal night (factor 1). */
export const SLEEP_RESTORATIVE_TARGET = 0.4;
export const SLEEP_QUALITY_MIN_FACTOR = 0.8;
export const SLEEP_QUALITY_MAX_FACTOR = 1.1;

/**
 * How well a wearable-tracked sleep refills Energy, from its deep + REM share of time asleep:
 * 0% gives 0.8, the 40% target gives 1, and 60% or more gives 1.1. Sleeps without stage data
 * (manual logs, short naps Fitbit only tracks as asleep/restless) count as 1.
 */
export function getSleepQualityFactor(sleep: LogSleepDetails | undefined): number {
  if (!sleep || sleep.asleepMinutes <= 0) return 1;
  if (sleep.deepMinutes == null && sleep.remMinutes == null) return 1;
  const share = ((sleep.deepMinutes ?? 0) + (sleep.remMinutes ?? 0)) / sleep.asleepMinutes;
  const factor = SLEEP_QUALITY_MIN_FACTOR + (1 - SLEEP_QUALITY_MIN_FACTOR) * (share / SLEEP_RESTORATIVE_TARGET);
  return Math.min(SLEEP_QUALITY_MAX_FACTOR, Math.max(SLEEP_QUALITY_MIN_FACTOR, factor));
}

export function getRefillEvent(
  behaviorId: string,
  log: BehaviorEntry['logs'][number],
  refill: NeedRefill | undefined,
  source: NeedMetadataSource | undefined,
): NeedEvent | undefined {
  const fromMetadata = source ? log.metadata?.[source.fieldKey] : undefined;
  if (source && typeof fromMetadata === 'number' && fromMetadata > 0 && source.fullAmount > 0) {
    return {
      ts: log.timestamp,
      kind: 'add',
      amount: (fromMetadata / source.fullAmount) * 100,
      behaviorId,
      logId: log.id,
    };
  }
  if (!refill) return undefined;
  if (refill.mode === 'set') return { ts: log.timestamp, kind: 'set', level: 100, behaviorId, logId: log.id };
  if (refill.mode === 'add')
    return { ts: log.timestamp, kind: 'add', amount: refill.amount, behaviorId, logId: log.id };
  if (log.endTimestamp == null || refill.fullMinutes <= 0) return undefined;
  // Wearable sleep logs count only time asleep, so a restless night refills less than its time in bed,
  // and are scaled by how much of it was deep and REM sleep.
  const minutes = log.sleep?.asleepMinutes ?? (log.endTimestamp - log.timestamp) / 60_000;
  return {
    ts: log.endTimestamp,
    kind: 'add',
    amount: (minutes / refill.fullMinutes) * 100 * getSleepQualityFactor(log.sleep),
    behaviorId,
    logId: log.id,
  };
}

/**
 * How a behaviour refills a need: its own setting, else its category's. A category that has the
 * need's metadata field (e.g. Calorie) refills by that field only, so its 0 kcal behaviours don't count.
 */
export function getBehaviorRefill(
  config: Pick<NeedConfig, 'refills' | 'categoryRefills'>,
  behavior: Pick<BehaviorEntry, 'id' | 'categoryId'>,
  source?: NeedMetadataSource,
): NeedRefill | undefined {
  const own = config.refills[behavior.id];
  if (own || !behavior.categoryId) return own;
  if (source?.categoryIds?.includes(behavior.categoryId)) return undefined;
  return config.categoryRefills?.[behavior.categoryId];
}

/**
 * Oldest first. Logs saved from the log form are timestamped to the minute, so a refill logged
 * right after a check-in can look up to a minute older than it. Within the same minute a
 * check-in therefore comes before refills, so the refill isn't wiped out by it.
 */
export function compareNeedEvents(a: NeedEvent, b: NeedEvent): number {
  const minuteA = Math.floor(a.ts / 60_000);
  const minuteB = Math.floor(b.ts / 60_000);
  if (minuteA !== minuteB) return minuteA - minuteB;
  const checkInA = a.kind === 'set' && a.checkIn ? 0 : 1;
  const checkInB = b.kind === 'set' && b.checkIn ? 0 : 1;
  return checkInA - checkInB || a.ts - b.ts;
}

/** Refills and check-ins for one need since `since`, oldest first. */
export function getNeedEvents(
  needId: NeedId,
  config: NeedConfig,
  behaviors: BehaviorEntry[],
  checkIns: NeedCheckIn[],
  source: NeedMetadataSource | undefined,
  since: number,
): NeedEvent[] {
  const events: NeedEvent[] = [];
  for (const behavior of behaviors) {
    const refill = getBehaviorRefill(config, behavior, source);
    if (!refill && !source) continue;
    for (const log of behavior.logs) {
      const end = log.endTimestamp ?? log.timestamp;
      if (end < since) continue;
      const event = getRefillEvent(behavior.id, log, refill, source);
      if (event) events.push(event);
    }
  }
  for (const checkIn of checkIns) {
    if (checkIn.needId === needId && checkIn.ts >= since) {
      events.push({ ts: checkIn.ts, kind: 'set', level: checkIn.level, checkIn: true, logId: checkIn.id });
    }
  }
  return events.sort(compareNeedEvents);
}

export interface NeedState {
  /** Undefined when nothing is known yet (no refills or check-ins in the lookback window). */
  level?: number;
  /** Level and time right after the last event, which the current level decays from. */
  anchor?: { ts: number; level: number };
  lastRefillAt?: number;
}

/** Replays events with a constant decay rate and returns the level at `now`. */
export function simulateNeed(events: NeedEvent[], decayPerHour: number, now: number): NeedState {
  const past = events.filter(event => event.ts <= now);
  if (past.length === 0) return {};
  let level = NEED_UNKNOWN_START_LEVEL;
  let t = past[0].ts;
  let lastRefillAt: number | undefined;
  for (const event of past) {
    level = clampLevel(level - (decayPerHour * Math.max(0, event.ts - t)) / MS_PER_HOUR);
    level = event.kind === 'add' ? clampLevel(level + event.amount) : clampLevel(event.level);
    if (event.kind === 'add' || !event.checkIn) lastRefillAt = event.ts;
    t = Math.max(t, event.ts);
  }
  const anchor = { ts: t, level };
  return {
    level: clampLevel(level - (decayPerHour * (now - t)) / MS_PER_HOUR),
    anchor,
    lastRefillAt,
  };
}

/**
 * New "hours to empty" after a check-in. The level fell from `anchor.level` to `level`
 * over the time since the anchor, which implies a rate; the stored rate moves part of the
 * way there, capped so one odd day can't swing it.
 */
export function learnEmptyHours(
  emptyHours: number,
  anchor: { ts: number; level: number } | undefined,
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
  return Math.round(Math.min(NEED_MAX_EMPTY_HOURS, Math.max(NEED_MIN_EMPTY_HOURS, hours)) * 10) / 10;
}

/** When the level reaches `line`, or undefined if it is already at or below it. */
export function getLineCrossingTime(level: number, decayPerHour: number, line: number, now: number) {
  if (level <= line || decayPerHour <= 0) return undefined;
  return now + ((level - line) / decayPerHour) * MS_PER_HOUR;
}

/** Moves a time inside quiet hours (23:00–07:00 local) to the next 07:00. */
export function shiftOutOfQuietHours(ts: number): number {
  const date = new Date(ts);
  const hour = date.getHours();
  if (hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR) return ts;
  const shifted = new Date(date);
  if (hour >= QUIET_START_HOUR) shifted.setDate(shifted.getDate() + 1);
  shifted.setHours(QUIET_END_HOUR, 0, 0, 0);
  return shifted.getTime();
}

export type NeedLevelTone = 'good' | 'low' | 'craving';

export function getNeedLevelTone(level: number, cravingLine: number): NeedLevelTone {
  if (level < cravingLine) return 'craving';
  if (level < 50) return 'low';
  return 'good';
}

function formatHoursMinutes(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (hours >= 10 || minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** "8h 40m" style length for "Empties in …". */
export function formatEmptyHours(emptyHours: number): string {
  return formatHoursMinutes(emptyHours * MS_PER_HOUR);
}

/** "Low now", "Low in ~40 min", "Low ~21:30", "Low tomorrow 09:10". */
export function formatNextCraving(
  level: number | undefined,
  config: NeedConfig,
  now: number,
  formatClock: (ts: number) => string,
): string {
  if (level == null) return 'No data yet · tap to check in';
  if (level < config.cravingLine) return 'Low now';
  const at = getLineCrossingTime(level, getDecayPerHour(config), config.cravingLine, now);
  if (at == null) return 'Low now';
  const ms = at - now;
  if (ms < 3 * MS_PER_HOUR) return `Low in ~${formatHoursMinutes(ms)}`;
  const sameDay = new Date(at).toDateString() === new Date(now).toDateString();
  if (sameDay) return `Low ~${formatClock(at)}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (new Date(at).toDateString() === tomorrow.toDateString()) return `Low tomorrow ${formatClock(at)}`;
  return `Low in ~${Math.round(ms / (24 * MS_PER_HOUR))} days`;
}

export function formatRefill(refill: NeedRefill): string {
  if (refill.mode === 'set') return 'Full';
  if (refill.mode === 'add') return `+${Math.round(refill.amount)}%`;
  return `Full after ${formatHoursMinutes(refill.fullMinutes * 60_000)}`;
}

/** Behaviours that refilled this need, most used in the last month first. */
export function getRefillBehaviorIds(
  config: NeedConfig,
  behaviors: BehaviorEntry[],
  source: NeedMetadataSource | undefined,
  now: number,
  limit = 6,
): string[] {
  const since = now - 30 * 24 * MS_PER_HOUR;
  const scored: Array<{ id: string; count: number; mapped: boolean }> = [];
  for (const behavior of behaviors) {
    if (behavior.archivedAt != null) continue;
    const mapped = getBehaviorRefill(config, behavior, source) != null;
    let count = 0;
    for (const log of behavior.logs) {
      if (log.timestamp < since) continue;
      if (mapped || (source && typeof log.metadata?.[source.fieldKey] === 'number')) count++;
    }
    if (mapped || count > 0) scored.push({ id: behavior.id, count, mapped });
  }
  return scored
    .sort((a, b) => b.count - a.count || Number(b.mapped) - Number(a.mapped))
    .slice(0, limit)
    .map(item => item.id);
}

/**
 * Behaviours whose names suggest they refill this need. Only offered until the user picks
 * behaviours or categories themselves.
 */
export function getSuggestedRefillIds(needId: NeedId, config: NeedConfig, behaviors: BehaviorEntry[], limit = 3) {
  if (Object.keys(config.refills).length > 0 || Object.keys(config.categoryRefills ?? {}).length > 0) return [];
  const { suggest } = NEED_INFO[needId];
  return behaviors
    .filter(
      behavior => behavior.archivedAt == null && config.refills[behavior.id] == null && suggest.test(behavior.name),
    )
    .sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0))
    .slice(0, limit)
    .map(behavior => behavior.id);
}

/** A sensible starting refill for a behaviour added to a need. */
export function getDefaultRefill(needId: NeedId): NeedRefill {
  if (needId === 'hygiene') return { mode: 'set' };
  if (needId === 'energy') return { mode: 'duration', fullMinutes: 8 * 60 };
  if (needId === 'thirst') return { mode: 'add', amount: 40 };
  return { mode: 'add', amount: 60 };
}

export function getNeedIdForBodySensation(sensation: string): NeedId | undefined {
  return NEED_IDS.find(id => NEED_INFO[id].bodySensations.includes(sensation));
}

const REFILL_CHOICES: NeedRefill[] = [
  { mode: 'add', amount: 15 },
  { mode: 'add', amount: 30 },
  { mode: 'add', amount: 40 },
  { mode: 'add', amount: 60 },
  { mode: 'set' },
  { mode: 'duration', fullMinutes: 8 * 60 },
];

/** The next refill amount when tapping a refill's amount pill. */
export function getNextRefill(refill: NeedRefill): NeedRefill {
  const index = REFILL_CHOICES.findIndex(choice => formatRefill(choice) === formatRefill(refill));
  return REFILL_CHOICES[(index + 1) % REFILL_CHOICES.length];
}

/** Every metadata field across categories, labelled with its category, for picking a need's source. */
export function getMetadataFieldChoices(categories: Category[]): Array<{ field: MetadataField; categoryName: string }> {
  const seen = new Set<string>();
  const choices: Array<{ field: MetadataField; categoryName: string }> = [];
  for (const category of categories) {
    for (const field of category.metadataFields ?? []) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      choices.push({ field, categoryName: category.name });
    }
  }
  return choices;
}

export function findMetadataField(categories: Category[], key: string): MetadataField | undefined {
  for (const category of categories) {
    const field = category.metadataFields?.find(item => item.key === key);
    if (field) return field;
  }
  return undefined;
}

export const NEED_NUDGE_ID_PREFIX = 'need-nudge:';
export const NEED_NOT_YET_ACTION = 'need-not-yet';
const MIN_NUDGE_LEAD_MS = 60_000;
const MAX_NUDGE_ACTIONS = 2;

export interface NeedNotificationData {
  kind: 'need';
  needId: NeedId;
  behaviorIds: string[];
  [key: string]: unknown;
}

export interface NeedNudgePlan {
  identifier: string;
  needId: NeedId;
  at: number;
  title: string;
  body: string;
  data: NeedNotificationData;
  actions: Array<{ id: string; title: string }>;
}

export interface NeedNudgeInput {
  id: NeedId;
  config: NeedConfig;
  level?: number;
  lastRefillAt?: number;
  /** Top refills, best first. */
  refills: Array<{ id: string; name: string }>;
}

function formatAgo(ms: number): string {
  return formatHoursMinutes(ms);
}

/** One scheduled push per need, for when it will cross its nudge line (moved out of quiet hours). */
export function getNeedNudgePlans(needs: NeedNudgeInput[], now: number): NeedNudgePlan[] {
  const plans: NeedNudgePlan[] = [];
  for (const need of needs) {
    if (!need.config.enabled || need.level == null) continue;
    const crossing = getLineCrossingTime(need.level, getDecayPerHour(need.config), need.config.nudgeLine, now);
    if (crossing == null) continue;
    const at = Math.round(shiftOutOfQuietHours(crossing) / 60_000) * 60_000;
    if (at - now < MIN_NUDGE_LEAD_MS) continue;
    const info = NEED_INFO[need.id];
    const top = need.refills.slice(0, MAX_NUDGE_ACTIONS);
    const since = need.lastRefillAt != null ? `Last refill ${formatAgo(at - need.lastRefillAt)} ago. ` : '';
    const suggestion = top.length ? `${top.map(item => item.name).join(' or ')}?` : 'Tap to check in.';
    plans.push({
      identifier: `${NEED_NUDGE_ID_PREFIX}${need.id}`,
      needId: need.id,
      at,
      title: `${info.emoji} ${info.label} is down to ${need.config.nudgeLine}%`,
      body: `${since}${suggestion}`,
      data: { kind: 'need', needId: need.id, behaviorIds: top.map(item => item.id) },
      actions: [
        ...top.map(item => ({ id: `log:${item.id}`, title: item.name })),
        { id: NEED_NOT_YET_ACTION, title: 'Not yet' },
      ],
    });
  }
  return plans;
}

export function isNeedNotificationData(data: unknown): data is NeedNotificationData {
  if (data == null || typeof data !== 'object') return false;
  const value = data as Partial<NeedNotificationData>;
  return value.kind === 'need' && typeof value.needId === 'string' && Array.isArray(value.behaviorIds);
}

export interface NeedRefillEntry {
  behaviorId: string;
  logId: string;
  ts: number;
  /** "+45%" or "Full". */
  amountLabel: string;
}

/**
 * Logs that refilled a need on the day `isToday` accepts, newest first. When there are none,
 * the single most recent refill from any day (or nothing if it was never refilled).
 */
export function getNeedRefillHistory(
  config: NeedConfig,
  behaviors: BehaviorEntry[],
  source: NeedMetadataSource | undefined,
  isToday: (ts: number) => boolean,
): { entries: NeedRefillEntry[]; today: boolean } {
  const all: NeedRefillEntry[] = [];
  for (const behavior of behaviors) {
    const refill = getBehaviorRefill(config, behavior, source);
    if (!refill && !source) continue;
    for (const log of behavior.logs) {
      const event = getRefillEvent(behavior.id, log, refill, source);
      if (!event) continue;
      all.push({
        behaviorId: behavior.id,
        logId: log.id,
        ts: event.ts,
        amountLabel: event.kind === 'add' ? `+${Math.round(event.amount)}%` : 'Full',
      });
    }
  }
  all.sort((a, b) => b.ts - a.ts);
  const todays = all.filter(entry => isToday(entry.ts));
  if (todays.length > 0) return { entries: todays, today: true };
  return { entries: all.slice(0, 1), today: false };
}
