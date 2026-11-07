import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { NeedCheckIn, NeedCheckInSource, NeedConfig, NeedId, NeedMetadataSource, NeedRefill } from '../types/need';
import {
  clampLevel,
  DEFAULT_NEED_CONFIGS,
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  learnEmptyHours,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  simulateNeed,
} from '../utils/need-utils';
import { useBehaviorStore } from './behavior-store';

const MAX_CHECK_INS = 500;

export interface NeedsStore {
  needs: Record<NeedId, NeedConfig>;
  checkIns: NeedCheckIn[];
  /** Records how the need feels now and nudges its decay rate toward what that implies. */
  checkIn: (needId: NeedId, level: number, source: NeedCheckInSource) => void;
  setRefill: (needId: NeedId, behaviorId: string, refill: NeedRefill | undefined) => void;
  setCategoryRefill: (needId: NeedId, categoryId: string, refill: NeedRefill | undefined) => void;
  setMetadataSource: (needId: NeedId, source: NeedMetadataSource | null | undefined) => void;
  setEnabled: (needId: NeedId, enabled: boolean) => void;
  resetLearning: (needId: NeedId) => void;
}

function withDefaults(needs: Partial<Record<NeedId, Partial<NeedConfig>>> | undefined): Record<NeedId, NeedConfig> {
  const result = {} as Record<NeedId, NeedConfig>;
  for (const id of NEED_IDS) {
    const saved = needs?.[id];
    result[id] = {
      ...DEFAULT_NEED_CONFIGS[id],
      ...saved,
      refills: { ...saved?.refills },
      categoryRefills: { ...saved?.categoryRefills },
    };
  }
  return result;
}

export const useNeedsStore = create<NeedsStore>()(
  persist(
    set => ({
      needs: withDefaults(undefined),
      checkIns: [],
      checkIn: (needId, level, source) =>
        set(state => {
          const now = Date.now();
          const config = state.needs[needId];
          const { behaviors, categories } = useBehaviorStore.getState();
          const events = getNeedEvents(
            needId,
            config,
            behaviors,
            state.checkIns,
            getNeedMetadataSource(needId, config, categories),
            now - NEED_LOOKBACK_MS,
          );
          const { anchor } = simulateNeed(events, getDecayPerHour(config), now);
          const entry: NeedCheckIn = { id: uuidv4(), needId, ts: now, level: clampLevel(level), source };
          const emptyHours = learnEmptyHours(config.emptyHours, anchor, entry);
          return {
            checkIns: [...state.checkIns, entry].slice(-MAX_CHECK_INS),
            needs: {
              ...state.needs,
              [needId]: {
                ...config,
                emptyHours,
                learnedFrom: emptyHours !== config.emptyHours ? config.learnedFrom + 1 : config.learnedFrom,
              },
            },
          };
        }),
      setRefill: (needId, behaviorId, refill) =>
        set(state => {
          const refills = { ...state.needs[needId].refills };
          if (refill) refills[behaviorId] = refill;
          else delete refills[behaviorId];
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], refills } } };
        }),
      setCategoryRefill: (needId, categoryId, refill) =>
        set(state => {
          const categoryRefills = { ...state.needs[needId].categoryRefills };
          if (refill) categoryRefills[categoryId] = refill;
          else delete categoryRefills[categoryId];
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], categoryRefills } } };
        }),
      setMetadataSource: (needId, source) =>
        set(state => ({ needs: { ...state.needs, [needId]: { ...state.needs[needId], metadataSource: source } } })),
      setEnabled: (needId, enabled) =>
        set(state => ({ needs: { ...state.needs, [needId]: { ...state.needs[needId], enabled } } })),
      resetLearning: needId =>
        set(state => ({
          needs: {
            ...state.needs,
            [needId]: {
              ...state.needs[needId],
              emptyHours: DEFAULT_NEED_CONFIGS[needId].emptyHours,
              learnedFrom: 0,
            },
          },
        })),
    }),
    {
      name: 'recupero-needs',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: persistedState => {
        const state = persistedState as Partial<NeedsStore>;
        return { ...state, needs: withDefaults(state.needs), checkIns: state.checkIns ?? [] } as NeedsStore;
      },
      merge: (persisted, current) => {
        const state = persisted as Partial<NeedsStore> | undefined;
        return { ...current, ...state, needs: withDefaults(state?.needs), checkIns: state?.checkIns ?? [] };
      },
    },
  ),
);
