export type MetadataFieldCalculation = 'manual' | 'amount' | 'per100';

export interface MetadataField {
  key: string;
  label: string;
  unit?: string;
  calculation?: MetadataFieldCalculation;
  dailyGoal?: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  metadataFields?: MetadataField[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  /** End of a timed session. Undefined for legacy/instant logs. */
  endTimestamp?: number;
  metadata?: Record<string, string | number>;
}

export type BehaviorType = 'undesirable' | 'neutral' | 'desirable';

export interface BehaviorEntry {
  id: string;
  name: string;
  type: BehaviorType;
  icon?:
    | string
    | {
        uri: string;
      };
  categoryId?: string;
  private?: boolean;
  lastTimestamp: number | null;
  metadata: Record<string, string | number>;
  defaultMetadata?: Record<string, number>;
  metadataAmountFieldKey?: string;
  metadataQuantityUnit?: string;
  logs: LogEntry[];
  cooldownMinutes: number;
  cooldownType?: 'rest' | 'limit';
  cooldownUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  /** Whether the user has opted into a cooldown. `undefined` for v1 logs;
   *  treat as `!!cooldownMinutes` for backward compat. */
  cooldownEnabled?: boolean;
  /** Opt-in star rating (1-3 stars). Undefined = feature off.
   *  A `null` slot means that tier is skipped (e.g. `[1, null, 5]` = jump
   *  from 1★ to 3★; `[1, 3, null]` = only 1★ and 2★).
   *  When all three slots are null, saving clears `starThresholds`
   *  and the feature is treated as off. */
  starThresholds?: [number, number | null, number | null];
  /** Period over which `starThresholds` are evaluated. Defaults to `'day'`
   *  for v1 stored data that predates this field. Ignored when
   *  `starThresholds` is undefined. */
  starPeriod?: StarPeriod;
  /** Opt-in XP calculation (level, XP bar). Sub-feature `xpDecay` is gated on this.
   *  Undefined = feature off. */
  xpEnabled?: true;
  /** Opt-in duration-based XP. Undefined = flat XP per log. */
  durationXpEnabled?: true;
  /** Hide the lifetime Total XP bar. Undefined = show total XP when XP bars are visible. */
  hideTotalXp?: true;
  /** Opt-in XP decay. For days/weeks/months, lose 1 log for each completed period
   *  with fewer than `every` logs. For hours, lose 1 log every `every` elapsed hours.
   *  Undefined = feature off. Ignored at runtime when `xpEnabled` is off. */
  xpDecay?: { every: number; unit: XpDecayUnit };
}

export type XpDecayUnit = 'hours' | 'days' | 'weeks' | 'months';

/** Period used to evaluate `BehaviorEntry.starThresholds`. */
export type StarPeriod = 'day' | 'week' | 'month';
