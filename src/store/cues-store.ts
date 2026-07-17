import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Cue,
  CueActivityEvent,
  CueActivityInput,
  CueInput,
  MoodId,
  MoodLog,
  SavedPlace,
  SavedPlaceInput,
} from '../types/cue';

export interface CuesStore {
  cues: Cue[];
  places: SavedPlace[];
  moodLogs: MoodLog[];
  activity: CueActivityEvent[];
  addCue: (cue: CueInput) => string;
  updateCue: (id: string, updates: Partial<CueInput>) => void;
  removeCue: (id: string) => void;
  toggleCue: (id: string) => void;
  addPlace: (place: SavedPlaceInput) => string;
  updatePlace: (id: string, updates: Partial<SavedPlaceInput>) => void;
  removePlace: (id: string) => void;
  logMood: (mood: MoodId, note?: string) => string;
  addActivityEvent: (event: CueActivityInput) => string;
}

export const useCuesStore = create<CuesStore>()(
  persist(
    set => ({
      cues: [],
      places: [],
      moodLogs: [],
      activity: [],
      addCue: cue => {
        const id = uuidv4();
        set(state => ({ cues: [...state.cues, { ...cue, id }] }));
        return id;
      },
      updateCue: (id, updates) =>
        set(state => ({
          cues: state.cues.map(cue => (cue.id === id ? { ...cue, ...updates } : cue)),
        })),
      removeCue: id => set(state => ({ cues: state.cues.filter(cue => cue.id !== id) })),
      toggleCue: id =>
        set(state => ({
          cues: state.cues.map(cue => (cue.id === id ? { ...cue, enabled: !cue.enabled } : cue)),
        })),
      addPlace: place => {
        const id = uuidv4();
        set(state => ({
          places: [
            ...state.places.map(saved => (place.isHome ? { ...saved, isHome: false } : saved)),
            { ...place, id },
          ],
        }));
        return id;
      },
      updatePlace: (id, updates) =>
        set(state => ({
          places: state.places.map(place => {
            if (place.id === id) return { ...place, ...updates };
            return updates.isHome ? { ...place, isHome: false } : place;
          }),
        })),
      removePlace: id => set(state => ({ places: state.places.filter(place => place.id !== id) })),
      logMood: (mood, note) => {
        const id = uuidv4();
        const ts = Date.now();
        const activityId = uuidv4();
        set(state => ({
          moodLogs: [...state.moodLogs, { id, mood, note: note?.trim() || undefined, ts }],
          activity: [...state.activity, { id: activityId, kind: 'mood', mood, ts }],
        }));
        return id;
      },
      addActivityEvent: event => {
        const id = uuidv4();
        set(state => ({
          activity: [...state.activity, { ...event, id, ts: event.ts ?? Date.now() }],
        }));
        return id;
      },
    }),
    {
      name: 'recupero-cues',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: persistedState => {
        const state = persistedState as Partial<CuesStore>;
        return {
          ...state,
          cues: state.cues ?? [],
          places: state.places ?? [],
          moodLogs: state.moodLogs ?? [],
          activity: state.activity ?? [],
        } as CuesStore;
      },
    },
  ),
);
