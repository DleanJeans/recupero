import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { HealthTokens } from '../types/health';
import { DEFAULT_AZM_DAILY_GOAL, MAX_WAKE_SLEEP_IDS } from '../utils/google-health-utils';
import { getDefaultRefill } from '../utils/need-utils';
import { useNeedsStore } from './needs-store';

/** Google Health (Fitbit) connection, synced Active Zone Minutes and which behaviour sleep logs go to.
 *  Kept out of backups: the tokens are per device. */
export interface HealthStore {
  tokens?: HealthTokens;
  /** Behaviour that synced sleep is logged to. Undefined = sleep isn't synced. */
  sleepBehaviorId?: string;
  azmDailyGoal: number;
  /** Active Zone Minutes by calendar day ("YYYY-MM-DD"). */
  azmByDay: Record<string, number>;
  /** Sleep data points already turned into logs, so a deleted log isn't re-created. */
  importedSleepIds: string[];
  /** Sleeps that already fired "Wake up" reminders, so each wake-up fires once. */
  wakeFiredSleepIds: string[];
  lastSyncAt?: number;
  lastError?: string;
  /** Not saved. */
  syncing: boolean;
  setTokens: (tokens: HealthTokens | undefined) => void;
  /** Also makes the behaviour refill Energy by time asleep, unless it already has an Energy refill. */
  setSleepBehavior: (behaviorId: string | undefined) => void;
  setAzmDailyGoal: (goal: number) => void;
  markWakeFired: (sleepId: string) => void;
  setSyncing: (syncing: boolean) => void;
  recordSync: (result: {
    at: number;
    azmByDay?: Record<string, number>;
    importedSleepIds?: string[];
    error?: string;
  }) => void;
  disconnect: () => void;
}

export const useHealthStore = create<HealthStore>()(
  persist(
    set => ({
      azmDailyGoal: DEFAULT_AZM_DAILY_GOAL,
      azmByDay: {},
      importedSleepIds: [],
      wakeFiredSleepIds: [],
      syncing: false,
      setTokens: tokens => set({ tokens }),
      setSleepBehavior: behaviorId => {
        if (behaviorId) {
          const needs = useNeedsStore.getState();
          if (!needs.needs.energy.refills[behaviorId]) {
            needs.setRefill('energy', behaviorId, getDefaultRefill('energy'));
          }
        }
        set({ sleepBehaviorId: behaviorId });
      },
      setAzmDailyGoal: goal => set({ azmDailyGoal: Math.max(1, Math.round(goal)) }),
      markWakeFired: sleepId =>
        set(state => ({ wakeFiredSleepIds: [...state.wakeFiredSleepIds, sleepId].slice(-MAX_WAKE_SLEEP_IDS) })),
      setSyncing: syncing => set({ syncing }),
      recordSync: ({ at, azmByDay, importedSleepIds, error }) =>
        set(state => ({
          lastSyncAt: error ? state.lastSyncAt : at,
          lastError: error,
          azmByDay: azmByDay ?? state.azmByDay,
          importedSleepIds: importedSleepIds ?? state.importedSleepIds,
        })),
      disconnect: () => set({ tokens: undefined, lastSyncAt: undefined, lastError: undefined, syncing: false }),
    }),
    {
      name: 'recupero-health',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: ({ syncing: _syncing, ...rest }) => rest,
    },
  ),
);
