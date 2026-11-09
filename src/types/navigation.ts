import type { BehaviorType } from './behavior';
import type { CueRef } from './cue';

export type RootStackParamList = {
  Home: undefined;
  Timer: undefined;
  Tasks: undefined;
  Day: undefined;
  BehaviorLog: {
    behaviorId: string;
    /** Initial view mode. Defaults to 'details' (log list). */
    initialMode?: 'log' | 'details';
    logId?: string;
    initialTimestamp?: number;
    initialNotes?: string;
    timerStartTimestamp?: number;
    timerEndTimestamp?: number;
    /** Cues to pre-select on a new log, e.g. the mood that suggested this behaviour. */
    initialCues?: CueRef[];
    /** Opened from a checklist row: the new log joins today's checklist run and ticks this item. */
    checklistItem?: { checklistId: string; itemId: string };
  };
  BehaviorForm: {
    behaviorId?: string;
    defaultCategoryId?: string;
    defaultXpEnabled?: boolean;
    defaultDurationXpEnabled?: boolean;
    selectedCategoryId?: string;
    /** Prefill for a new behaviour, e.g. the search text when nothing matched. */
    defaultName?: string;
    defaultType?: BehaviorType;
  };
  CategoryForm: {
    categoryId?: string;
    selectOnSave?: boolean;
  };
  Shop: undefined;
  MoneyLog: undefined;
  Settings: undefined;
  NeedsHistory: undefined;
  Cues: undefined;
  CueForm: { cueId?: string } | undefined;
  CueActivity: undefined;
  SavedPlaces: undefined;
  LocationEdit: { placeId?: string } | undefined;
  MoodLog: undefined;
  BodyLog: undefined;
  Cravings: undefined;
  /** Urge-surfing timer for a craving. Resumes cravingId, or an unfinished craving for the behaviour, or starts one. */
  RideItOut: { behaviorId: string; cravingId?: string };
  /** Create (no checklistId) or edit a checklist. behaviorIds prefills a new one from select mode on Routines. */
  ChecklistForm: { checklistId?: string; behaviorIds?: string[] };
  ChecklistRun: { checklistId: string };
};
