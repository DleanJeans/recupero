import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  SunlightCalibrationStep,
  SunlightGeofenceEvent,
  SunlightPresenceSample,
  SunlightRange,
  SunlightWeather,
} from '../types/sunlight';
import { clampGeofenceRadius } from '../utils/geofence-utils';
import {
  addCalibrationStep,
  DEFAULT_SUNLIGHT_GOAL_MINUTES,
  DEFAULT_SUNLIGHT_RADIUS_M,
  MAX_SUNLIGHT_GOAL_MINUTES,
  MIN_SUNLIGHT_GOAL_MINUTES,
} from '../utils/sunlight-utils';

const MAX_SAMPLES = 500;
const MAX_EVENTS = 2000;

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
  events: SunlightGeofenceEvent[];
  /** Stretches outside the user deleted (e.g. misfires from a small radius); cut out of the counted time. */
  deletedRanges: SunlightRange[];
  deleteRange: (range: SunlightRange) => void;
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
      events: [],
      deletedRanges: [],
      deleteRange: range => set(state => ({ deletedRanges: [...state.deletedRanges, range] })),
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
      addEvent: event => set(state => ({ events: [...state.events, event].slice(-MAX_EVENTS) })),
      addSample: sample => set(state => ({ samples: [...state.samples, sample].slice(-MAX_SAMPLES) })),
      setWeather: weather => set({ weather }),
    }),
    {
      name: 'recupero-sunlight',
      storage: createJSONStorage(() => AsyncStorage),
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
