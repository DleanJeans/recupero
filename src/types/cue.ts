export type CueTriggerType = 'location' | 'time' | 'habit' | 'mood';

export type MoodId = 'great' | 'good' | 'okay' | 'stressed' | 'low' | 'tired';

export type CueTrigger =
  | { type: 'location'; placeId: string; direction: 'enter' | 'exit' }
  | { type: 'time'; mode: 'simple'; at: string; repeatDays: number[] }
  | { type: 'time'; mode: 'auto'; pattern: 'wakeup' }
  | { type: 'time'; mode: 'auto'; pattern: 'afterBehavior'; behaviorId: string; delayMin: number }
  | { type: 'habit'; behaviorId: string; delayMin?: number }
  | { type: 'mood'; moods: MoodId[] };

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

export interface CueActivityEvent {
  id: string;
  kind: 'enter' | 'exit' | 'mood';
  placeId?: string;
  mood?: MoodId;
  ts: number;
}

export type CueInput = Omit<Cue, 'id'>;
export type SavedPlaceInput = Omit<SavedPlace, 'id'>;
export type CueActivityInput = Omit<CueActivityEvent, 'id' | 'ts'> & { ts?: number };
