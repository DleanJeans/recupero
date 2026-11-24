import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CueRef } from '../types/cue';
import type { StackedLog } from '../utils/metadata-calculation-utils';

/** A log whose details were entered up front ("Save for later"); it is logged, with the time it is finished, later. */
export interface PendingLog {
  id: string;
  behaviorId: string;
  /** When the details were entered (e.g. when the drink was made). */
  savedAt: number;
  /** Metadata text-input values, keyed by field key, exactly as typed in the log form. */
  metadataValues: Record<string, string>;
  notes: string;
  cues: CueRef[];
  /** Other behaviours stacked with this one; logged together with it. */
  stacked?: StackedLog[];
}

interface PendingLogsState {
  pendingLogs: PendingLog[];
  /** Add a pending log, or replace the one with `id` when given. Returns its id. */
  savePending: (log: Omit<PendingLog, 'id' | 'savedAt'> & { id?: string }) => string;
  removePending: (id: string) => void;
}

export const usePendingLogsStore = create<PendingLogsState>()(
  persist(
    (set, get) => ({
      pendingLogs: [],
      savePending: ({ id, ...rest }) => {
        const existing = id ? get().pendingLogs.find(p => p.id === id) : undefined;
        const nextId = existing?.id ?? uuidv4();
        const next: PendingLog = { ...rest, id: nextId, savedAt: existing?.savedAt ?? Date.now() };
        set(state => ({
          pendingLogs: existing
            ? state.pendingLogs.map(p => (p.id === nextId ? next : p))
            : [...state.pendingLogs, next],
        }));
        return nextId;
      },
      removePending: id => set(state => ({ pendingLogs: state.pendingLogs.filter(p => p.id !== id) })),
    }),
    {
      name: 'pending-logs-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
