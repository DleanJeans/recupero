import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CravingLog, CravingOutcome, UrgeLevel } from '../types/craving';
import type { CueRef } from '../types/cue';
import { DEFAULT_RIDE_MS } from '../utils/craving-utils';

export interface CravingsStore {
  cravings: CravingLog[];
  /** Alternatives the user picked for each craved behaviour ("Instead, try…"), by behaviour id. */
  alternatives: Record<string, string[]>;
  startCraving: (behaviorId: string, cues?: CueRef[]) => string;
  rateUrge: (id: string, level: UrgeLevel) => void;
  setCravingCues: (id: string, cues: CueRef[]) => void;
  endCraving: (id: string, outcome: CravingOutcome, redirectBehaviorId?: string) => void;
  discardCraving: (id: string) => void;
  setAlternatives: (behaviorId: string, alternativeIds: string[]) => void;
}

export const useCravingsStore = create<CravingsStore>()(
  persist(
    set => ({
      cravings: [],
      alternatives: {},
      startCraving: (behaviorId, cues) => {
        const id = uuidv4();
        set(state => ({
          cravings: [
            ...state.cravings,
            {
              id,
              behaviorId,
              startedAt: Date.now(),
              rideMs: DEFAULT_RIDE_MS,
              ratings: [],
              cues: cues?.length ? cues : undefined,
            },
          ],
        }));
        return id;
      },
      rateUrge: (id, level) =>
        set(state => ({
          cravings: state.cravings.map(craving =>
            craving.id === id ? { ...craving, ratings: [...craving.ratings, { ts: Date.now(), level }] } : craving,
          ),
        })),
      setCravingCues: (id, cues) =>
        set(state => ({
          cravings: state.cravings.map(craving =>
            craving.id === id ? { ...craving, cues: cues.length ? cues : undefined } : craving,
          ),
        })),
      endCraving: (id, outcome, redirectBehaviorId) =>
        set(state => ({
          cravings: state.cravings.map(craving =>
            craving.id === id
              ? {
                  ...craving,
                  outcome,
                  endedAt: Date.now(),
                  redirectBehaviorId: outcome === 'redirected' ? redirectBehaviorId : undefined,
                }
              : craving,
          ),
        })),
      discardCraving: id => set(state => ({ cravings: state.cravings.filter(craving => craving.id !== id) })),
      setAlternatives: (behaviorId, alternativeIds) =>
        set(state => {
          const alternatives = { ...state.alternatives };
          if (alternativeIds.length) alternatives[behaviorId] = alternativeIds;
          else delete alternatives[behaviorId];
          return { alternatives };
        }),
    }),
    {
      name: 'recupero-cravings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: persistedState => {
        const state = persistedState as Partial<CravingsStore>;
        return { ...state, cravings: state.cravings ?? [], alternatives: state.alternatives ?? {} } as CravingsStore;
      },
    },
  ),
);
