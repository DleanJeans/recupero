import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** One timer's state. The store's top-level fields are the timer open on the Timer screen; others wait in `parked`. */
export interface TimerSession {
  lockedBehaviorId: string;
  initialNotes: string | undefined;
  startTimestamp: number | undefined;
  stopTimestamp: number | undefined;
  pendingLogBehaviorLogCount: number | undefined;
  pausedAt: number | undefined;
  /** App opened with this timer. Leaving that app stops the timer and logs it (see useAppTimerAutoStop). */
  appPackage?: string;
  /** Task this timer is for. Logged into the category's Task field when there is one, else its title goes in the notes. */
  taskId?: string;
}

interface TimerStore {
  /** Other timers running (or paused/waiting to be logged) next to the one above. Each is for a different behavior. */
  parked: TimerSession[];
  /** Move the current timer aside, so the Timer screen is free to start another one. */
  parkCurrent: () => void;
  /** Open the parked timer of `behaviorId` on the Timer screen, parking the current one. */
  switchTo: (behaviorId: string) => void;
  /** Stop and drop the running timer for `behaviorId` (on screen or parked), returning the time it ran. Paused or missing: undefined. */
  takeRunning: (behaviorId: string, now: number) => { start: number; end: number } | undefined;
  /** Drop parked timers whose behavior no longer exists. */
  pruneParked: (existingBehaviorIds: Set<string>) => void;
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
  /** Set while paused: the segment before it was already saved as its own log, and Resume starts a new one. */
  pausedAt: number | undefined;
  /** App opened with the current timer, if any. */
  appPackage: string | undefined;
  /** Task the current timer is for, if any. */
  taskId: string | undefined;
  start: (behaviorId: string, timestamp?: number, initialNotes?: string, appPackage?: string, taskId?: string) => void;
  setLockedBehavior: (behaviorId: string) => void;
  setStart: (timestamp: number) => void;
  /** Moves the start of the running segment (keeps a pending stop). */
  moveStart: (timestamp: number) => void;
  setStop: (timestamp: number) => void;
  /** Pause after the running segment was logged: no segment runs until `resume`. */
  pause: (timestamp: number) => void;
  /** Start a new segment at `timestamp`, so paused time is never counted. Clears any stop and pending-log state. */
  resume: (timestamp: number) => void;
  markLogPending: (logCount: number) => void;
  clearPendingLog: () => void;
  reset: () => void;
}

const EMPTY_CURRENT = {
  lockedBehaviorId: undefined,
  initialNotes: undefined,
  startTimestamp: undefined,
  stopTimestamp: undefined,
  pendingLogBehaviorLogCount: undefined,
  pausedAt: undefined,
  appPackage: undefined,
  taskId: undefined,
};

/** A timer that has started or is paused; a behavior merely picked on the Timer screen is not worth keeping. */
export function isTimerSessionActive(timer: Pick<TimerSession, 'startTimestamp' | 'pausedAt'> | undefined): boolean {
  return timer != null && (timer.startTimestamp != null || timer.pausedAt != null);
}

function currentSession(state: TimerStore): TimerSession | undefined {
  if (state.lockedBehaviorId == null || !isTimerSessionActive(state)) return undefined;
  return {
    lockedBehaviorId: state.lockedBehaviorId,
    initialNotes: state.initialNotes,
    startTimestamp: state.startTimestamp,
    stopTimestamp: state.stopTimestamp,
    pendingLogBehaviorLogCount: state.pendingLogBehaviorLogCount,
    pausedAt: state.pausedAt,
    appPackage: state.appPackage,
    taskId: state.taskId,
  };
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      parked: [],
      parkCurrent: () => {
        const session = currentSession(get());
        set({ ...EMPTY_CURRENT, parked: session ? [...get().parked, session] : get().parked });
      },
      switchTo: behaviorId => {
        const state = get();
        const target = state.parked.find(session => session.lockedBehaviorId === behaviorId);
        if (!target) return;
        const current = currentSession(state);
        const rest = state.parked.filter(session => session !== target);
        set({ ...target, parked: current ? [...rest, current] : rest });
      },
      takeRunning: (behaviorId, now) => {
        const state = get();
        if (state.lockedBehaviorId === behaviorId && state.startTimestamp != null && state.stopTimestamp == null) {
          const range = { start: state.startTimestamp, end: now };
          set({ ...EMPTY_CURRENT });
          return range;
        }
        const parked = state.parked.find(
          session =>
            session.lockedBehaviorId === behaviorId && session.startTimestamp != null && session.stopTimestamp == null,
        );
        if (!parked || parked.startTimestamp == null) return undefined;
        set({ parked: state.parked.filter(session => session !== parked) });
        return { start: parked.startTimestamp, end: now };
      },
      pruneParked: existing => {
        const parked = get().parked.filter(session => existing.has(session.lockedBehaviorId));
        if (parked.length !== get().parked.length) set({ parked });
      },
      lockedBehaviorId: undefined,
      initialNotes: undefined,
      startTimestamp: undefined,
      stopTimestamp: undefined,
      pendingLogBehaviorLogCount: undefined,
      pausedAt: undefined,
      appPackage: undefined,
      taskId: undefined,
      start: (behaviorId, timestamp = Date.now(), initialNotes, appPackage, taskId) => {
        const state = get();
        // Already open in the background: bring it forward instead of starting it twice.
        if (state.parked.some(session => session.lockedBehaviorId === behaviorId)) {
          state.switchTo(behaviorId);
          return;
        }
        // A timer for another behavior keeps running next to the new one.
        const current = state.lockedBehaviorId !== behaviorId ? currentSession(state) : undefined;
        set({
          lockedBehaviorId: behaviorId,
          initialNotes,
          appPackage,
          taskId,
          startTimestamp: timestamp,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
          pausedAt: undefined,
          parked: current ? [...state.parked, current] : state.parked,
        });
      },
      setLockedBehavior: behaviorId =>
        set(state =>
          state.lockedBehaviorId === behaviorId ? {} : { lockedBehaviorId: behaviorId, appPackage: undefined },
        ),
      setStart: timestamp => set({ startTimestamp: timestamp, stopTimestamp: undefined, pausedAt: undefined }),
      moveStart: timestamp => set(state => (state.startTimestamp == null ? {} : { startTimestamp: timestamp })),
      setStop: timestamp => set({ stopTimestamp: timestamp }),
      pause: timestamp =>
        set({
          startTimestamp: undefined,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
          pausedAt: timestamp,
        }),
      resume: timestamp =>
        set({
          startTimestamp: timestamp,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
          pausedAt: undefined,
        }),
      markLogPending: logCount => set({ pendingLogBehaviorLogCount: logCount }),
      clearPendingLog: () => set({ pendingLogBehaviorLogCount: undefined }),
      reset: () =>
        set({
          lockedBehaviorId: undefined,
          initialNotes: undefined,
          startTimestamp: undefined,
          stopTimestamp: undefined,
          pendingLogBehaviorLogCount: undefined,
          pausedAt: undefined,
          appPackage: undefined,
          taskId: undefined,
        }),
    }),
    {
      name: 'recupero-timer',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
