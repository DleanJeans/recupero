export type CueTriggerType = 'location' | 'time' | 'habit' | 'mood' | 'body';

export type MoodId = 'great' | 'good' | 'okay' | 'stressed' | 'low' | 'tired';

export type BodySensationId = 'pee' | 'hungry' | 'thirsty' | 'tired' | 'sleepy' | 'aches';

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
