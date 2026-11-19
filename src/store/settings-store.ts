import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { normalizeDayCutoffHour } from '../utils/date-utils';
import { DEFAULT_TOAST_POSITION, type ReminderToastPosition } from '../utils/reminder-toast-utils';
import { DEFAULT_PLACE_DWELL_MIN, GEOFENCE_MIN_RADIUS_M } from '../utils/reminder-utils';

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
  /** Area (m) every place reminder watches. Android misses geofences much below 100 m, so lower is less reliable. */
  reminderRadiusM: number;
  setReminderRadiusM: (v: number) => void;
  /** Minutes you must stay at a place before an "I enter" reminder fires. 0 = fire immediately. */
  placeDwellMin: number;
  setPlaceDwellMin: (v: number) => void;
  /** Category ids whose Routines view shows the Cook a batch button. null = never chosen (default categories apply). */
  cookBatchCategoryIds: string[] | null;
  setCookBatchCategoryIds: (v: string[]) => void;
  /** Habit reminders that fire while the app is open show as a toast card instead of a system notification. */
  reminderToastEnabled: boolean;
  setReminderToastEnabled: (v: boolean) => void;
  reminderToastPosition: ReminderToastPosition;
  setReminderToastPosition: (v: ReminderToastPosition) => void;
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
      reminderRadiusM: GEOFENCE_MIN_RADIUS_M,
      placeDwellMin: DEFAULT_PLACE_DWELL_MIN,
      cookBatchCategoryIds: null,
      reminderToastEnabled: true,
      reminderToastPosition: DEFAULT_TOAST_POSITION,
      setTimeFormat: format => set({ timeFormat: format }),
      setDayCutoffHour: hour => set({ dayCutoffHour: normalizeDayCutoffHour(hour) }),
      setHidePrivate: v => set({ hidePrivate: v }),
      setHideCategoryNames: v => set({ hideCategoryNames: v }),
      setShowXp: v => set({ showXp: v }),
      setMoneyRewardsEnabled: v => set({ moneyRewardsEnabled: v }),
      setBehaviorHeaderExpanded: v => set({ behaviorHeaderExpanded: v }),
      setReminderRadiusM: v => set({ reminderRadiusM: v }),
      setPlaceDwellMin: v => set({ placeDwellMin: v }),
      setCookBatchCategoryIds: v => set({ cookBatchCategoryIds: v }),
      setReminderToastEnabled: v => set({ reminderToastEnabled: v }),
      setReminderToastPosition: v => set({ reminderToastPosition: v }),
    }),
    {
      name: 'recupero-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
