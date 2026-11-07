export type CueTriggerType = 'location' | 'time' | 'habit' | 'mood' | 'body';

export type BuiltInMoodId = 'great' | 'good' | 'okay' | 'stressed' | 'low' | 'tired';

export type BuiltInBodySensationId = 'pee' | 'hungry' | 'thirsty' | 'tired' | 'sleepy' | 'aches';

/** A built-in mood id, or the id of a mood the user added (CustomCueOption.id). */
export type MoodId = BuiltInMoodId | (string & {});

/** A built-in body sensation id, or the id of a sensation the user added (CustomCueOption.id). */
export type BodySensationId = BuiltInBodySensationId | (string & {});

/** A mood or body sensation shown as a tile/chip: built-in or added by the user. */
export interface CueOption {
  id: string;
  emoji: string;
  label: string;
}

/** Moods and body sensations the user added on top of the built-in ones. */
export interface CustomCueOptions {
  moods: CueOption[];
  sensations: CueOption[];
}

/**
 * Something that prompted a behaviour log: a saved place, a mood, or a body sensation.
 * Stored on LogEntry.cues as `place:<placeId>`, `mood:<MoodId>` or `body:<BodySensationId>`.
 */
export type CueRef = `place:${string}` | `mood:${MoodId}` | `body:${BodySensationId}`;

export type CueSourceKind = 'place' | 'mood' | 'body';

export type CueTrigger =
  | { type: 'location'; placeId: string; direction: 'enter' | 'exit' }
  | { type: 'time'; mode: 'simple'; at: string; repeatDays: number[] }
  | { type: 'time'; mode: 'auto'; pattern: 'wakeup' }
  | { type: 'time'; mode: 'auto'; pattern: 'afterBehavior'; behaviorId: string; delayMin: number }
  | { type: 'habit'; behaviorId: string; delayMin?: number }
  | { type: 'mood'; moods: MoodId[] }
  | { type: 'body'; sensations: BodySensationId[] };

export interface Cue {
  id: string;
  enabled: boolean;
  name?: string;
  trigger: CueTrigger;
  conditions?: CueTrigger[];
  combiner?: 'AND' | 'OR';
  behaviorIds: string[];
  notify: { push: boolean };
}

export interface SavedPlace {
  id: string;
  name: string;
  /** User-chosen emoji shown as the place's icon. Unset falls back to the pin (or 🏠 for Home). */
  emoji?: string;
  address?: string;
  lat: number;
  lng: number;
  radiusM: number;
  isHome: boolean;
}

export interface MoodLog {
  id: string;
  mood: MoodId;
  note?: string;
  ts: number;
}

export interface BodySensationLog {
  id: string;
  sensation: BodySensationId;
  note?: string;
  ts: number;
}

export interface CueActivityEvent {
  id: string;
  kind: 'enter' | 'exit' | 'mood' | 'body';
  placeId?: string;
  mood?: MoodId;
  sensation?: BodySensationId;
  ts: number;
}

export type CueInput = Omit<Cue, 'id'>;
export type SavedPlaceInput = Omit<SavedPlace, 'id'>;
export type CueActivityInput = Omit<CueActivityEvent, 'id' | 'ts'> & { ts?: number };
