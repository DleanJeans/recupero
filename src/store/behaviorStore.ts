import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEntry } from '../types/behavior';

interface BehaviorStore {
  behaviors: BehaviorEntry[];
  addBehavior: (name: string, icon?: string | { uri: string }) => void;
  logBehavior: (id: string, metadata?: Record<string, string | number>) => void;
  removeBehavior: (id: string) => void;
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set) => ({
      behaviors: [],
      addBehavior: (name, icon) =>
        set((state) => ({
          behaviors: [
            ...state.behaviors,
            {
              id: uuidv4(),
              name,
              icon,
              lastTimestamp: null,
              metadata: {},
            },
          ],
        })),
      logBehavior: (id, metadata = {}) =>
        set((state) => ({
          behaviors: state.behaviors.map((t) =>
            t.id === id
              ? {
                  ...t,
                  lastTimestamp: Date.now(),
                  metadata: { ...t.metadata, ...metadata },
                }
              : t,
          ),
        })),
      removeBehavior: (id) =>
        set((state) => ({
          behaviors: state.behaviors.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'recupero-behaviors',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
