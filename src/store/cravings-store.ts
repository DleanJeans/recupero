import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CravingLog, CravingOutcome, UrgeLevel } from '../types/craving';
import type { CueRef } from '../types/cue';
import type { CopingUrge, CravingsView } from '../types/urge';
import { DEFAULT_RIDE_MS } from '../utils/craving-utils';
import { createCopingUrge } from '../utils/urge-utils';

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
  /** Coping behaviours shown as rising urge bars on the Cravings tab, in the order added. */
  urges: CopingUrge[];
  /** Cravings tab layout: one board, or urges grouped under the need they cope for. */
  view: CravingsView;
  addUrges: (behaviorIds: string[]) => void;
  updateUrge: (behaviorId: string, patch: Partial<Omit<CopingUrge, 'behaviorId' | 'addedAt'>>) => void;
  removeUrge: (behaviorId: string) => void;
  setView: (view: CravingsView) => void;
}

export const useCravingsStore = create<CravingsStore>()(
  persist(
    set => ({
      cravings: [],
      alternatives: {},
      urges: [],
      view: 'board',
      addUrges: behaviorIds =>
        set(state => {
          const known = new Set(state.urges.map(urge => urge.behaviorId));
          const now = Date.now();
          const added = behaviorIds.filter(id => !known.has(id)).map(id => createCopingUrge(id, now));
          return added.length ? { urges: [...state.urges, ...added] } : {};
        }),
      updateUrge: (behaviorId, patch) =>
        set(state => ({
          urges: state.urges.map(urge => (urge.behaviorId === behaviorId ? { ...urge, ...patch } : urge)),
        })),
      removeUrge: behaviorId => set(state => ({ urges: state.urges.filter(urge => urge.behaviorId !== behaviorId) })),
      setView: view => set({ view }),
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
      version: 2,
      migrate: persistedState => {
        const state = persistedState as Partial<CravingsStore>;
        return {
          ...state,
          cravings: state.cravings ?? [],
          alternatives: state.alternatives ?? {},
          urges: state.urges ?? [],
          view: state.view ?? 'board',
        } as CravingsStore;
      },
    },
  ),
);
