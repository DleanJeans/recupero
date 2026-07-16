import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TimerStore {
  /** Behavior locked in for the current timer session, if any. */
  lockedBehaviorId: string | undefined;
  /** Notes to prefill when logging the current timer session. */
  initialNotes: string | undefined;
  /** Wall-clock instant the user hit Start. Drives elapsed time. */
  startTimestamp: number | undefined;
  /** Wall-clock instant the user hit Stop, if applicable. Undefined while running. */
  stopTimestamp: number | undefined;
  /** Snapshot of the locked behavior's `logs.length` taken at the moment the
   *  user hit Stop. On focus, we compare against the current value — if a
   *  log was added, the save succeeded and the timer should reset; if not,
   *  the user just backed out and the stopped timer should stay (so Relog
   *  remains available). */
  pendingLogBehaviorLogCount: number | undefined;
  start: (behaviorId: string, timestamp?: number, initialNotes?: string) => void;
  setLockedBehavior: (behaviorId: string) => void;
  setStart: (timestamp: number) => void;
  rewindStartMinute: () => void;
  setStop: (timestamp: number) => void;
  /** Clear the stop timestamp so the timer resumes from the original start
   *  instant. Also clears any pending-log snapshot since the user is
   *  abandoning the previous log attempt. */
  resume: () => void;
  markLogPending: (logCount: number) => void;
  clearPendingLog: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    set => ({
      lockedBehaviorId: undefined,
      initialNotes: undefined,
      startTimestamp: undefined,
      stopTimestamp: undefined,
      pendingLogBehaviorLogCount: undefined,
      start: (behaviorId, timestamp = Date.now(), initialNotes) =>
        set({
          lockedBehaviorId: behaviorId,
          initialNotes,
          startTimestamp: timestamp,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
        }),
      setLockedBehavior: behaviorId => set({ lockedBehaviorId: behaviorId }),
      setStart: timestamp => set({ startTimestamp: timestamp, stopTimestamp: undefined }),
      rewindStartMinute: () =>
        set(state => (state.startTimestamp == null ? {} : { startTimestamp: state.startTimestamp - 60_000 })),
      setStop: timestamp => set({ stopTimestamp: timestamp }),
      resume: () => set({ stopTimestamp: undefined, pendingLogBehaviorLogCount: undefined }),
      markLogPending: logCount => set({ pendingLogBehaviorLogCount: logCount }),
      clearPendingLog: () => set({ pendingLogBehaviorLogCount: undefined }),
      reset: () =>
        set({
          lockedBehaviorId: undefined,
          initialNotes: undefined,
          startTimestamp: undefined,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
        }),
    }),
    {
      name: 'recupero-timer',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
