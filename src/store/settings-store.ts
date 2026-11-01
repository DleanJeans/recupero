import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { normalizeDayCutoffHour } from '../utils/date-utils';

export type TimeFormat = '12h' | '24h';

interface SettingsStore {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  dayCutoffHour: number;
  setDayCutoffHour: (hour: number) => void;
  hidePrivate: boolean;
  setHidePrivate: (v: boolean) => void;
  hideCategoryNames: boolean;
  setHideCategoryNames: (v: boolean) => void;
  showXp: boolean;
  setShowXp: (v: boolean) => void;
  /** Money rewards feature: off hides balances, reward amounts, and money fields. Stored data is kept. */
  moneyRewardsEnabled: boolean;
  setMoneyRewardsEnabled: (v: boolean) => void;
  /** Behaviour screen header: stats card unfolded (bars) vs folded (chips). */
  behaviorHeaderExpanded: boolean;
  setBehaviorHeaderExpanded: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      timeFormat: '12h',
      dayCutoffHour: 0,
      hidePrivate: false,
      hideCategoryNames: false,
      showXp: true,
      moneyRewardsEnabled: true,
      behaviorHeaderExpanded: false,
      setTimeFormat: format => set({ timeFormat: format }),
      setDayCutoffHour: hour => set({ dayCutoffHour: normalizeDayCutoffHour(hour) }),
      setHidePrivate: v => set({ hidePrivate: v }),
      setHideCategoryNames: v => set({ hideCategoryNames: v }),
      setShowXp: v => set({ showXp: v }),
      setMoneyRewardsEnabled: v => set({ moneyRewardsEnabled: v }),
      setBehaviorHeaderExpanded: v => set({ behaviorHeaderExpanded: v }),
    }),
    {
      name: 'recupero-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
