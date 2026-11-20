/** Built-in need ids, plus `custom:<id>` for needs the user made. */
export type NeedId = string;

/** A need the user made: it uses the same model as the built-in ones. */
export interface CustomNeedDef {
  id: NeedId;
  emoji: string;
  label: string;
  /** Hours from 100% to 0% before any check-in teaches a better rate. */
  emptyHours: number;
  color: string;
}

/** How logging a behaviour refills a need. */
export type NeedRefill =
  /** Adds a fixed number of percentage points. */
  | { mode: 'add'; amount: number }
  /** Sets the need to 100%. */
  | { mode: 'set' }
  /** Adds by the log's duration: `fullMinutes` takes the need from 0% to 100% (e.g. sleep). */
  | { mode: 'duration'; fullMinutes: number };

/** Refills a need from a metadata field on any log, e.g. kcal for Hunger. */
export interface NeedMetadataSource {
  /** The first (or only) field. Kept so needs saved before several fields were allowed still load. */
  fieldKey: string;
  /** All fields that fill the need; each log adds up the ones it has. Missing on older saves: then just `fieldKey`. */
  fieldKeys?: string[];
  /** Only behaviours in these categories fill the need by metadata. Empty or missing = every category. */
  categoryFilter?: string[];
  /** The summed field value that takes the need from 0% to 100%. */
  fullAmount: number;
  /**
   * Categories that have the field, filled in when the source is resolved (not saved). Their
   * behaviours refill by the field only, so a 0 kcal "Drink water" in Food doesn't get the
   * Food category's fixed amount.
   */
  categoryIds?: string[];
}

/** `update` = topped up by hand without logging a behaviour (e.g. a meal with several foods). */
export type NeedCheckInSource = 'tap' | 'body' | 'notification' | 'update';

/** The user saying how a need feels right now. Sets the level and teaches the decay rate. */
export interface NeedCheckIn {
  id: string;
  needId: NeedId;
  ts: number;
  level: number;
  source: NeedCheckInSource;
  /**
   * Set on updates: percentage points added without a log. The entry then counts as a refill
   * (it doesn't set the level or teach the decay rate), and `level` is what it came to.
   */
  amount?: number;
}

export interface NeedConfig {
  enabled: boolean;
  /** Hours to go from 100% to 0%. Learned from check-ins. */
  emptyHours: number;
  /** Below this the need shows in the Cravings tab. */
  cravingLine: number;
  /** Crossing this sends a push notification. */
  nudgeLine: number;
  /** Behaviours that refill this need, by behaviour id. Wins over the behaviour's category. */
  refills: Record<string, NeedRefill>;
  /** Whole categories whose behaviours refill this need, by category id. */
  categoryRefills?: Record<string, NeedRefill>;
  /** Typed-in amounts (percentage points) for single logs, by log id. They replace what the log would refill. */
  logAmounts?: Record<string, number>;
  /**
   * Comma-separated words: a body sensation whose label contains one lowers this need to its craving line
   * (e.g. "itch, sweat"). Undefined = the need's default words; empty = none.
   */
  bodyWords?: string;
  /** Undefined = automatic (Hunger picks a calorie field). Null = off. */
  metadataSource?: NeedMetadataSource | null;
  /** How many check-ins have adjusted the rate since the last reset. */
  learnedFrom: number;
}
