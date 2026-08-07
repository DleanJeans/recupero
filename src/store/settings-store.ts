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
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      timeFormat: '12h',
      dayCutoffHour: 0,
      hidePrivate: false,
      hideCategoryNames: false,
      showXp: true,
      setTimeFormat: format => set({ timeFormat: format }),
      setDayCutoffHour: hour => set({ dayCutoffHour: normalizeDayCutoffHour(hour) }),
      setHidePrivate: v => set({ hidePrivate: v }),
      setHideCategoryNames: v => set({ hideCategoryNames: v }),
      setShowXp: v => set({ showXp: v }),
    }),
    {
      name: 'recupero-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
