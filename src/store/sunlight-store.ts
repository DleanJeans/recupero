import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  SunlightCalibrationStep,
  SunlightGeofenceEvent,
  SunlightManualSession,
  SunlightPause,
  SunlightPresenceSample,
  SunlightRange,
  SunlightTrailPoint,
  SunlightWeather,
} from '../types/sunlight';
import { clampGeofenceRadius } from '../utils/geofence-utils';
import { sunlightStorage } from '../utils/sunlight-persist';
import { addTrailPoints } from '../utils/sunlight-timeline-utils';
import {
  addCalibrationStep,
  DEFAULT_SUNLIGHT_GOAL_MINUTES,
  DEFAULT_SUNLIGHT_RADIUS_M,
  getActivePause,
  getFreeSessionStart,
  MAX_MANUAL_SESSIONS,
  MAX_SUNLIGHT_EVENTS,
  MAX_SUNLIGHT_GOAL_MINUTES,
  MAX_SUNLIGHT_PAUSES,
  MAX_SUNLIGHT_SAMPLES,
  MIN_SUNLIGHT_GOAL_MINUTES,
  mergeSunlightHistory,
  type SunlightHistory,
} from '../utils/sunlight-utils';

export interface SunlightStore {
  enabled: boolean;
  /** Outdoor time before this doesn't count (when tracking was last turned on). */
  trackingSince: number;
  goalMinutes: number;
  /** Saved places that count as being outside (a park, a running track). Every other place is indoors. */
  outdoorPlaceIds: string[];
  /** Geofence radius around each indoor place; step past it and the counter starts. */
  radiusM: number;
  /** Ongoing notification counting up while you're outside in daylight (Android). */
  liveNotification: boolean;
  /** Lux-meter calibrations, each applying from when it was made onwards (earlier days keep their old factor). */
  luxCalibrations: SunlightCalibrationStep[];
  /** Calibrate from now on; 1 resets to the plain estimate. */
  setLuxCalibration: (factor: number) => void;
  setLiveNotification: (on: boolean) => void;
  /** Share of the light that reaches your eyes (not looking at the sky), each applying from when it was set. */
  eyeLevelFactors: SunlightCalibrationStep[];
  /** Set the eye-level share from now on; earlier time keeps its old share. */
  setEyeLevelFactor: (factor: number) => void;
  /**
   * Outside Mode: follow your position about every second in the background (GPS + foreground service) while
   * you move between places; costs battery. Stored under its old name, "precise tracking".
   */
  preciseTracking: boolean;
  /** When Outside Mode was last turned on. */
  preciseSince?: number;
  setPreciseTracking: (on: boolean) => void;
  /** Outside Mode's fine positions for the path on the map. */
  trail: SunlightTrailPoint[];
  addTrailPoints: (points: SunlightTrailPoint[]) => void;
  events: SunlightGeofenceEvent[];
  /** Stretches outside the user deleted (e.g. misfires from a small radius); cut out of the counted time. */
  deletedRanges: SunlightRange[];
  deleteRange: (range: SunlightRange) => void;
  /** Sessions started by hand, e.g. sitting on a balcony while the phone says you're at home. */
  manualSessions: SunlightManualSession[];
  /** Starts a session at this lux (ending one that's still running). */
  startManualSession: (lux: number) => void;
  stopManualSession: () => void;
  deleteManualSession: (start: number) => void;
  deletedManualStarts: number[];
  /** Detection paused by hand (e.g. visiting somewhere that isn't a saved place); it resumes by itself at `until`. */
  pause?: SunlightPause;
  /** Earlier pauses, cut out of the counted time. */
  pauses: SunlightRange[];
  /** Stops counting now (time so far is kept) until `until`; changing an active pause keeps its start. */
  pauseUntil: (until: number, pin?: SunlightPause['pin']) => void;
  /** Ends the pause now. */
  resumeSunlight: () => void;
  /**
   * Saves new times or light for a session in Today. A detected one becomes a fixed session (its original stretch is
   * cut out); a manual one is replaced. `lux` unset keeps the weather estimate.
   */
  editSession: (
    original: SunlightRange & { manual?: boolean; edited?: boolean },
    next: { start: number; end: number; lux?: number },
  ) => void;
  samples: SunlightPresenceSample[];
  weather?: SunlightWeather;
  setEnabled: (enabled: boolean) => void;
  setGoalMinutes: (minutes: number) => void;
  toggleOutdoorPlace: (placeId: string) => void;
  setRadiusM: (radiusM: number) => void;
  addEvent: (event: SunlightGeofenceEvent) => void;
  addSample: (sample: SunlightPresenceSample) => void;
  setWeather: (weather: SunlightWeather) => void;
}

export const useSunlightStore = create<SunlightStore>()(
  persist(
    set => ({
      enabled: true,
      trackingSince: Date.now(),
      goalMinutes: DEFAULT_SUNLIGHT_GOAL_MINUTES,
      outdoorPlaceIds: [],
      radiusM: DEFAULT_SUNLIGHT_RADIUS_M,
      liveNotification: true,
      luxCalibrations: [],
      setLuxCalibration: factor =>
        set(state => ({ luxCalibrations: addCalibrationStep(state.luxCalibrations, Date.now(), factor) })),
      setLiveNotification: liveNotification => set({ liveNotification }),
      eyeLevelFactors: [],
      setEyeLevelFactor: factor =>
        set(state => ({ eyeLevelFactors: addCalibrationStep(state.eyeLevelFactors, Date.now(), factor) })),
      preciseTracking: false,
      preciseSince: undefined,
      setPreciseTracking: preciseTracking =>
        set(state =>
          preciseTracking === state.preciseTracking
            ? state
            : { preciseTracking, preciseSince: preciseTracking ? Date.now() : undefined },
        ),
      trail: [],
      addTrailPoints: points => set(state => ({ trail: addTrailPoints(state.trail, points) })),
      events: [],
      deletedRanges: [],
      deleteRange: range => set(state => ({ deletedRanges: [...state.deletedRanges, range] })),
      manualSessions: [],
      startManualSession: lux =>
        set(state => {
          const now = Date.now();
          const closed = state.manualSessions.map(session =>
            session.end == null ? { ...session, end: now } : session,
          );
          return { manualSessions: [...closed, { start: now, lux }].slice(-MAX_MANUAL_SESSIONS) };
        }),
      stopManualSession: () =>
        set(state => {
          const now = Date.now();
          return {
            manualSessions: state.manualSessions.map(session =>
              session.end == null ? { ...session, end: now } : session,
            ),
          };
        }),
      deletedManualStarts: [],
      editSession: (original, next) =>
        set(state => {
          const isSession = original.manual || original.edited;
          const old = isSession ? state.manualSessions.find(session => session.start === original.start) : undefined;
          const sameStart = old != null && next.start === old.start;
          const deletedManualStarts =
            old && !sameStart ? [...state.deletedManualStarts, old.start] : state.deletedManualStarts;
          const start = sameStart ? next.start : getFreeSessionStart(next.start, deletedManualStarts);
          const session: SunlightManualSession = {
            start,
            end: next.end,
            lux: next.lux,
            edited: old ? old.edited : true,
          };
          return {
            manualSessions: [...state.manualSessions.filter(item => item.start !== original.start), session]
              .sort((a, b) => a.start - b.start)
              .slice(-MAX_MANUAL_SESSIONS),
            deletedManualStarts,
            deletedRanges: isSession
              ? state.deletedRanges
              : [...state.deletedRanges, { start: original.start, end: original.end }],
          };
        }),
      deleteManualSession: start =>
        set(state => ({
          manualSessions: state.manualSessions.filter(session => session.start !== start),
          deletedManualStarts: [...state.deletedManualStarts, start],
        })),
      pause: undefined,
      pauses: [],
      pauseUntil: (until, pin) =>
        set(state => {
          const now = Date.now();
          const active = getActivePause(state.pause, now);
          // A pause that already ran out is history; start a fresh one.
          const pauses =
            state.pause && !active
              ? [...state.pauses, { start: state.pause.start, end: state.pause.until }]
              : state.pauses;
          return {
            pauses: pauses.slice(-MAX_SUNLIGHT_PAUSES),
            pause: { start: active?.start ?? now, until, ...(pin ? { pin } : {}) },
          };
        }),
      resumeSunlight: () =>
        set(state => {
          const { pause } = state;
          if (!pause) return state;
          const now = Date.now();
          const ended = { start: pause.start, end: Math.min(now, pause.until) };
          return { pause: undefined, pauses: [...state.pauses, ended].slice(-MAX_SUNLIGHT_PAUSES) };
        }),
      samples: [],
      weather: undefined,
      setEnabled: enabled =>
        set(state =>
          enabled === state.enabled ? state : { enabled, trackingSince: enabled ? Date.now() : state.trackingSince },
        ),
      setGoalMinutes: minutes =>
        set({
          goalMinutes: Math.max(MIN_SUNLIGHT_GOAL_MINUTES, Math.min(MAX_SUNLIGHT_GOAL_MINUTES, Math.round(minutes))),
        }),
      toggleOutdoorPlace: placeId =>
        set(state => ({
          outdoorPlaceIds: state.outdoorPlaceIds.includes(placeId)
            ? state.outdoorPlaceIds.filter(id => id !== placeId)
            : [...state.outdoorPlaceIds, placeId],
        })),
      setRadiusM: radiusM => set({ radiusM: clampGeofenceRadius(Math.round(radiusM)) }),
      addEvent: event => set(state => ({ events: [...state.events, event].slice(-MAX_SUNLIGHT_EVENTS) })),
      addSample: sample => set(state => ({ samples: [...state.samples, sample].slice(-MAX_SUNLIGHT_SAMPLES) })),
      setWeather: weather => set({ weather }),
    }),
    {
      name: 'recupero-sunlight',
      storage: createJSONStorage(() => sunlightStorage),
      // Rehydrating (app back in front, background task) folds in what another copy of the app saved meanwhile.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SunlightStore>;
        return { ...current, ...saved, ...mergeSunlightHistory(current as SunlightHistory, saved) };
      },
      version: 2,
      migrate: persisted => {
        const state = (persisted ?? {}) as Partial<SunlightStore> & { luxCalibration?: number };
        const { luxCalibration, ...rest } = state;
        // v1 had one factor that applied to everything; keep it applying to all existing time.
        const luxCalibrations =
          rest.luxCalibrations ??
          (luxCalibration != null && luxCalibration !== 1 ? [{ from: 0, factor: luxCalibration }] : []);
        return { ...rest, luxCalibrations } as SunlightStore;
      },
    },
  ),
);
