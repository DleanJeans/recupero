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

const TASK_RUNS_KEY = 'recupero-sunlight-task-runs';
const MAX_TASK_RUNS = 40;
const PRECISE_NOTE_GAP_MS = 60_000;
let lastPreciseNote = 0;

export interface SunlightTaskRun {
  ts: number;
  task: 'geofence' | 'precise';
  /** Whether the app was on screen when the task ran. */
  appState: string;
}

/**
 * Notes that a background task ran (outside the sunlight store, so it survives whatever happens to it). The
 * tracking log shows these, to tell "Android never woke the app" apart from "it woke but the data got lost".
 */
export async function noteSunlightTaskRun(task: SunlightTaskRun['task'], appState: string): Promise<void> {
  const now = Date.now();
  if (task === 'precise') {
    if (now - lastPreciseNote < PRECISE_NOTE_GAP_MS) return;
    lastPreciseNote = now;
  }
  try {
    const saved = parseTaskRuns(await AsyncStorage.getItem(TASK_RUNS_KEY));
    await AsyncStorage.setItem(
      TASK_RUNS_KEY,
      JSON.stringify([...saved, { ts: now, task, appState }].slice(-MAX_TASK_RUNS)),
    );
  } catch {
    // Diagnostics only.
  }
}

function parseTaskRuns(value: string | null): SunlightTaskRun[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getSunlightTaskRuns(): Promise<SunlightTaskRun[]> {
  return parseTaskRuns(await AsyncStorage.getItem(TASK_RUNS_KEY).catch(() => null));
}
