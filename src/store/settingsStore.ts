import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TimeFormat = '12h' | '24h';

interface SettingsStore {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  hidePrivate: boolean;
  setHidePrivate: (v: boolean) => void;
  hideCategoryNames: boolean;
  setHideCategoryNames: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      timeFormat: '12h',
      hidePrivate: false,
      hideCategoryNames: false,
      setTimeFormat: format => set({ timeFormat: format }),
      setHidePrivate: v => set({ hidePrivate: v }),
      setHideCategoryNames: v => set({ hideCategoryNames: v }),
    }),
    {
      name: 'recupero-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
