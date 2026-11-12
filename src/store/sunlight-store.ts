import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SunlightPresenceSample, SunlightWeather } from '../types/sunlight';
import {
  DEFAULT_SUNLIGHT_GOAL_MINUTES,
  MAX_SUNLIGHT_GOAL_MINUTES,
  MIN_SUNLIGHT_GOAL_MINUTES,
} from '../utils/sunlight-utils';

const MAX_SAMPLES = 500;

export interface SunlightStore {
  enabled: boolean;
  /** Outdoor time before this doesn't count (when tracking was last turned on). */
  trackingSince: number;
  goalMinutes: number;
  /** Saved places that count as being outside (a park, a running track). Every other place is indoors. */
  outdoorPlaceIds: string[];
  samples: SunlightPresenceSample[];
  weather?: SunlightWeather;
  setEnabled: (enabled: boolean) => void;
  setGoalMinutes: (minutes: number) => void;
  toggleOutdoorPlace: (placeId: string) => void;
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
      addSample: sample => set(state => ({ samples: [...state.samples, sample].slice(-MAX_SAMPLES) })),
      setWeather: weather => set({ weather }),
    }),
    {
      name: 'recupero-sunlight',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
