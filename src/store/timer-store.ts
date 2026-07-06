import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TimerStore {
  /** Behavior locked in for the current timer session, if any. */
  lockedBehaviorId: string | undefined;
  /** Wall-clock instant the user hit Start. Drives elapsed time. */
  startTimestamp: number | undefined;
  /** Wall-clock instant the user hit Stop, if applicable. Undefined while running. */
  stopTimestamp: number | undefined;
  setLockedBehavior: (behaviorId: string) => void;
  setStart: (timestamp: number) => void;
  setStop: (timestamp: number) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    set => ({
      lockedBehaviorId: undefined,
      startTimestamp: undefined,
      stopTimestamp: undefined,
      setLockedBehavior: behaviorId => set({ lockedBehaviorId: behaviorId }),
      setStart: timestamp => set({ startTimestamp: timestamp, stopTimestamp: undefined }),
      setStop: timestamp => set({ stopTimestamp: timestamp }),
      reset: () => set({ lockedBehaviorId: undefined, startTimestamp: undefined, stopTimestamp: undefined }),
    }),
    {
      name: 'recupero-timer',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
