import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';
import { mergeSunlightHistory, type SunlightHistory } from './sunlight-utils';

interface PersistedValue {
  state?: Partial<SunlightHistory> & Record<string, unknown>;
  version?: number;
}

function parse(value: string | null): PersistedValue | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as PersistedValue;
  } catch {
    return undefined;
  }
}

/**
 * AsyncStorage for the sunlight store that merges the event history with what's already saved instead of
 * overwriting it, so a background copy of the app and the main one can't erase each other's arrivals and departures.
 */
export const sunlightStorage: StateStorage = {
  getItem: name => AsyncStorage.getItem(name),
  removeItem: name => AsyncStorage.removeItem(name),
  setItem: async (name, value) => {
    const next = parse(value);
    const saved = parse(await AsyncStorage.getItem(name));
    if (!next?.state || !saved?.state || saved.version !== next.version) {
      await AsyncStorage.setItem(name, value);
      return;
    }
    const state = { ...next.state, ...mergeSunlightHistory(saved.state, next.state) };
    await AsyncStorage.setItem(name, JSON.stringify({ ...next, state }));
  },
};
