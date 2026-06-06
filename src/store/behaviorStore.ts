import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEntry, Category } from '../types/behavior';

interface BehaviorStore {
  behaviors: BehaviorEntry[];
  categories: Category[];
  addBehavior: (
    name: string,
    icon?:
      | string
      | {
          uri: string;
        },
    cooldownMinutes?: number,
    cooldownType?: 'rest' | 'limit',
    categoryId?: string,
    cooldownUnit?: 'minutes' | 'hours' | 'days' | 'weeks',
  ) => void;
  updateBehaviorCooldown: (behaviorId: string, cooldownMinutes: number) => void;
  updateBehavior: (
    behaviorId: string,
    updates: {
      name?: string;
      icon?:
        | string
        | {
            uri: string;
          }
        | undefined;
      cooldownMinutes?: number;
      cooldownType?: 'rest' | 'limit';
      categoryId?: string | undefined;
      cooldownUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | undefined;
    },
  ) => void;
  logBehavior: (id: string, timestamp?: number, metadata?: Record<string, string | number>) => void;
  removeBehavior: (id: string) => void;
  removeLog: (behaviorId: string, logId: string) => void;
  updateLog: (behaviorId: string, logId: string, timestamp: number) => void;
  getBehaviorLogs: (behaviorId: string) => BehaviorEntry['logs'];
  addCategory: (name: string, emoji: string) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, updates: { name?: string; emoji?: string }) => void;
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      behaviors: [],
      categories: [],
      addBehavior: (name, icon, cooldownMinutes = 0, cooldownType = 'rest', categoryId, cooldownUnit) =>
        set((state) => ({
          behaviors: [
            ...state.behaviors,
            {
              id: uuidv4(),
              name,
              icon,
              categoryId,
              lastTimestamp: null,
              metadata: {},
              logs: [],
              cooldownMinutes,
              cooldownType,
              cooldownUnit,
            },
          ],
        })),
      logBehavior: (id, timestamp, metadata = {}) =>
        set((state) => ({
          behaviors: state.behaviors.map((t) =>
            t.id === id
              ? {
                  ...t,
                  lastTimestamp: timestamp ?? Date.now(),
                  metadata: {
                    ...t.metadata,
                    ...metadata,
                  },
                  logs: [
                    ...t.logs,
                    {
                      id: uuidv4(),
                      timestamp: timestamp ?? Date.now(),
                      metadata,
                    },
                  ],
                }
              : t,
          ),
        })),
      removeBehavior: (id) =>
        set((state) => ({
          behaviors: state.behaviors.filter((t) => t.id !== id),
        })),
      removeLog: (behaviorId, logId) =>
        set((state) => ({
          behaviors: state.behaviors.map((b) =>
            b.id === behaviorId
              ? {
                  ...b,
                  logs: b.logs.filter((log) => log.id !== logId),
                  lastTimestamp:
                    b.logs.filter((log) => log.id !== logId).length > 0
                      ? Math.max(...b.logs.filter((log) => log.id !== logId).map((log) => log.timestamp))
                      : null,
                }
              : b,
          ),
        })),
      updateBehaviorCooldown: (behaviorId, cooldownMinutes) =>
        set((state) => ({
          behaviors: state.behaviors.map((b) =>
            b.id === behaviorId
              ? {
                  ...b,
                  cooldownMinutes,
                }
              : b,
          ),
        })),
      updateBehavior: (behaviorId, updates) =>
        set((state) => ({
          behaviors: state.behaviors.map((b) =>
            b.id === behaviorId
              ? {
                  ...b,
                  ...updates,
                }
              : b,
          ),
        })),
      addCategory: (name, emoji) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: uuidv4(),
              name,
              emoji,
            },
          ],
        })),
      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          behaviors: state.behaviors.map((b) =>
            b.categoryId === id ? { ...b, categoryId: undefined } : b,
          ),
        })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),
      updateLog: (behaviorId, logId, timestamp) =>
        set((state) => ({
          behaviors: state.behaviors.map((b) =>
            b.id === behaviorId
              ? {
                  ...b,
                  logs: b.logs.map((log) =>
                    log.id === logId
                      ? {
                          ...log,
                          timestamp,
                        }
                      : log,
                  ),
                  lastTimestamp: Math.max(...b.logs.map((log) => (log.id === logId ? timestamp : log.timestamp))),
                }
              : b,
          ),
        })),
      getBehaviorLogs: (behaviorId) => {
        const behavior = get().behaviors.find((b) => b.id === behaviorId);
        return behavior?.logs ?? [];
      },
    }),
    {
      name: 'recupero-behaviors',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
