import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { NeedCheckIn, NeedCheckInSource, NeedConfig, NeedId, NeedMetadataSource, NeedRefill } from '../types/need';
import { emptyRateHistory, type NeedRatePoint } from '../utils/need-history-utils';
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
const MAX_RATE_POINTS = 200;

export type NeedHistoryDisplay = 'lanes' | 'overlay';

export interface NeedsStore {
  needs: Record<NeedId, NeedConfig>;
  checkIns: NeedCheckIn[];
  /** Each need's learned rate over time, so history charts use the rate you had then. */
  rateHistory: Record<NeedId, NeedRatePoint[]>;
  /** Needs history screen: one chart per need, or all needs on one chart. */
  historyDisplay: NeedHistoryDisplay;
  setHistoryDisplay: (display: NeedHistoryDisplay) => void;
  /** The Energy scoring explainer atop a sleep behaviour's log list was dismissed. */
  energyRuleHidden: boolean;
  setEnergyRuleHidden: (hidden: boolean) => void;
  /** Records how the need feels now and nudges its decay rate toward what that implies. */
  checkIn: (needId: NeedId, level: number, source: NeedCheckInSource) => void;
  setRefill: (needId: NeedId, behaviorId: string, refill: NeedRefill | undefined) => void;
  setCategoryRefill: (needId: NeedId, categoryId: string, refill: NeedRefill | undefined) => void;
  setMetadataSource: (needId: NeedId, source: NeedMetadataSource | null | undefined) => void;
  setEnabled: (needId: NeedId, enabled: boolean) => void;
  resetLearning: (needId: NeedId) => void;
}

function withRateHistory(
  saved: Partial<Record<NeedId, NeedRatePoint[]>> | undefined,
  needs: Record<NeedId, NeedConfig>,
): Record<NeedId, NeedRatePoint[]> {
  const result = emptyRateHistory();
  for (const id of NEED_IDS) {
    const points = saved?.[id];
    if (points?.length) result[id] = points;
    // Rates learned before history was kept apply from the start.
    else if (needs[id].emptyHours !== DEFAULT_NEED_CONFIGS[id].emptyHours) {
      result[id] = [{ ts: 0, emptyHours: needs[id].emptyHours }];
    }
  }
  return result;
}

const appendRate = (points: NeedRatePoint[], ts: number, emptyHours: number) =>
  [...points, { ts, emptyHours }].slice(-MAX_RATE_POINTS);

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
      rateHistory: emptyRateHistory(),
      historyDisplay: 'lanes',
      setHistoryDisplay: display => set({ historyDisplay: display }),
      energyRuleHidden: false,
      setEnergyRuleHidden: hidden => set({ energyRuleHidden: hidden }),
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
          const learned = emptyHours !== config.emptyHours;
          return {
            checkIns: [...state.checkIns, entry].slice(-MAX_CHECK_INS),
            rateHistory: learned
              ? { ...state.rateHistory, [needId]: appendRate(state.rateHistory[needId], now, emptyHours) }
              : state.rateHistory,
            needs: {
              ...state.needs,
              [needId]: {
                ...config,
                emptyHours,
                learnedFrom: learned ? config.learnedFrom + 1 : config.learnedFrom,
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
          rateHistory: {
            ...state.rateHistory,
            [needId]: appendRate(state.rateHistory[needId], Date.now(), DEFAULT_NEED_CONFIGS[needId].emptyHours),
          },
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
      version: 2,
      migrate: persistedState => {
        const state = persistedState as Partial<NeedsStore>;
        const needs = withDefaults(state.needs);
        return {
          ...state,
          needs,
          checkIns: state.checkIns ?? [],
          rateHistory: withRateHistory(state.rateHistory, needs),
        } as NeedsStore;
      },
      merge: (persisted, current) => {
        const state = persisted as Partial<NeedsStore> | undefined;
        const needs = withDefaults(state?.needs);
        return {
          ...current,
          ...state,
          needs,
          checkIns: state?.checkIns ?? [],
          rateHistory: withRateHistory(state?.rateHistory, needs),
        };
      },
    },
  ),
);
