export type NeedId = 'hunger' | 'thirst' | 'hygiene' | 'energy';

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
  fieldKey: string;
  /** The field value that takes the need from 0% to 100%. */
  fullAmount: number;
}

export type NeedCheckInSource = 'tap' | 'body' | 'notification';

/** The user saying how a need feels right now. Sets the level and teaches the decay rate. */
export interface NeedCheckIn {
  id: string;
  needId: NeedId;
  ts: number;
  level: number;
  source: NeedCheckInSource;
}

export interface NeedConfig {
  enabled: boolean;
  /** Hours to go from 100% to 0%. Learned from check-ins. */
  emptyHours: number;
  /** Below this the need shows in the Cravings tab. */
  cravingLine: number;
  /** Crossing this sends a push notification. */
  nudgeLine: number;
  /** Behaviours that refill this need, by behaviour id. */
  refills: Record<string, NeedRefill>;
  /** Undefined = automatic (Hunger picks a calorie field). Null = off. */
  metadataSource?: NeedMetadataSource | null;
  /** How many check-ins have adjusted the rate since the last reset. */
  learnedFrom: number;
}
