import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type CheckInSettings, DEFAULT_CHECKIN_SETTINGS } from '../utils/checkin-utils';

interface CheckInStore extends CheckInSettings {
  setNudgesEnabled: (enabled: boolean) => void;
  toggleNudgeHour: (hour: number) => void;
  setSkipWithinHours: (hours: number) => void;
  setStreakSaverEnabled: (enabled: boolean) => void;
  setStaleHours: (hours: number) => void;
}

/** Settings for the Cues check-in card (stale time) and its notification nudges. XP and streaks come from the logs. */
export const useCheckInStore = create<CheckInStore>()(
  persist(
    set => ({
      ...DEFAULT_CHECKIN_SETTINGS,
      setNudgesEnabled: nudgesEnabled => set({ nudgesEnabled }),
      toggleNudgeHour: hour =>
        set(state => ({
          nudgeHours: state.nudgeHours.includes(hour)
            ? state.nudgeHours.filter(item => item !== hour)
            : [...state.nudgeHours, hour].sort((a, b) => a - b),
        })),
      setSkipWithinHours: skipWithinHours => set({ skipWithinHours }),
      setStreakSaverEnabled: streakSaverEnabled => set({ streakSaverEnabled }),
      setStaleHours: staleHours => set({ staleHours }),
    }),
    {
      name: 'recupero-checkin',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<CheckInStore>) }),
    },
  ),
);
