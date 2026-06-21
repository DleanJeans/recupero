import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEntry, BehaviorType, Category, MetadataField } from '../types/behavior';

interface BehaviorStore {
  behaviors: BehaviorEntry[];
  categories: Category[];
  addBehavior: (
    name: string,
    type: BehaviorType,
    icon?:
      | string
      | {
          uri: string;
        },
    cooldownMinutes?: number,
    cooldownType?: 'rest' | 'limit',
    categoryId?: string,
    cooldownUnit?: 'minutes' | 'hours' | 'days' | 'weeks',
    isPrivate?: boolean,
    defaultMetadata?: Record<string, number>,
    starThresholds?: [number, number, number],
    xpEnabled?: true,
    xpDecay?: { every: number; unit: 'days' | 'weeks' | 'months' },
  ) => void;
  updateBehaviorCooldown: (behaviorId: string, cooldownMinutes: number) => void;
  updateBehavior: (
    behaviorId: string,
    updates: {
      name?: string;
      type?: BehaviorType;
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
      private?: boolean;
      defaultMetadata?: Record<string, number>;
      starThresholds?: [number, number, number] | undefined;
      xpEnabled?: true;
      xpDecay?: { every: number; unit: 'days' | 'weeks' | 'months' } | undefined;
    },
  ) => void;
  logBehavior: (id: string, timestamp?: number, metadata?: Record<string, string | number>) => void;
  removeBehavior: (id: string) => void;
  removeLog: (behaviorId: string, logId: string) => void;
  updateLog: (behaviorId: string, logId: string, timestamp: number, metadata?: Record<string, string | number>) => void;
  getBehaviorLogs: (behaviorId: string) => BehaviorEntry['logs'];
  addCategory: (name: string, emoji: string, metadataFields?: MetadataField[]) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, updates: { name?: string; emoji?: string; metadataFields?: MetadataField[] }) => void;
  updateCategoryMetadataFields: (id: string, metadataFields: MetadataField[]) => void;
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      behaviors: [],
      categories: [],
      addBehavior: (
        name,
        type,
        icon,
        cooldownMinutes = 0,
        cooldownType = 'rest',
        categoryId,
        cooldownUnit,
        isPrivate = false,
        defaultMetadata,
        starThresholds,
        xpEnabled,
        xpDecay,
      ) =>
        set(state => ({
          behaviors: [
            ...state.behaviors,
            {
              id: uuidv4(),
              name,
              type,
              icon,
              categoryId,
              private: isPrivate,
              lastTimestamp: null,
              metadata: {},
              defaultMetadata,
              logs: [],
              cooldownMinutes,
              cooldownType,
              cooldownUnit,
              starThresholds,
              xpEnabled,
              xpDecay,
            },
          ],
        })),
      logBehavior: (id, timestamp, metadata = {}) =>
        set(state => ({
          behaviors: state.behaviors.map(t =>
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
      removeBehavior: id =>
        set(state => ({
          behaviors: state.behaviors.filter(t => t.id !== id),
        })),
      removeLog: (behaviorId, logId) =>
        set(state => ({
          behaviors: state.behaviors.map(b =>
            b.id === behaviorId
              ? {
                  ...b,
                  logs: b.logs.filter(log => log.id !== logId),
                  lastTimestamp:
                    b.logs.filter(log => log.id !== logId).length > 0
                      ? Math.max(...b.logs.filter(log => log.id !== logId).map(log => log.timestamp))
                      : null,
                }
              : b,
          ),
        })),
      updateBehaviorCooldown: (behaviorId, cooldownMinutes) =>
        set(state => ({
          behaviors: state.behaviors.map(b =>
            b.id === behaviorId
              ? {
                  ...b,
                  cooldownMinutes,
                }
              : b,
          ),
        })),
      updateBehavior: (behaviorId, updates) =>
        set(state => ({
          behaviors: state.behaviors.map(b =>
            b.id === behaviorId
              ? {
                  ...b,
                  ...updates,
                }
              : b,
          ),
        })),
      addCategory: (name, emoji, metadataFields) =>
        set(state => ({
          categories: [
            ...state.categories,
            {
              id: uuidv4(),
              name,
              emoji,
              metadataFields,
            },
          ],
        })),
      removeCategory: id =>
        set(state => ({
          categories: state.categories.filter(c => c.id !== id),
          behaviors: state.behaviors.map(b => (b.categoryId === id ? { ...b, categoryId: undefined } : b)),
        })),
      updateCategory: (id, updates) =>
        set(state => ({
          categories: state.categories.map(c => (c.id === id ? { ...c, ...updates } : c)),
        })),
      updateCategoryMetadataFields: (id, metadataFields) =>
        set(state => ({
          categories: state.categories.map(c => (c.id === id ? { ...c, metadataFields } : c)),
        })),
      updateLog: (behaviorId, logId, timestamp, metadata) =>
        set(state => ({
          behaviors: state.behaviors.map(b =>
            b.id === behaviorId
              ? {
                  ...b,
                  logs: b.logs.map(log =>
                    log.id === logId
                      ? {
                          ...log,
                          timestamp,
                          metadata: metadata ?? log.metadata,
                        }
                      : log,
                  ),
                  lastTimestamp: Math.max(...b.logs.map(log => (log.id === logId ? timestamp : log.timestamp))),
                }
              : b,
          ),
        })),
      getBehaviorLogs: behaviorId => {
        const behavior = get().behaviors.find(b => b.id === behaviorId);
        return behavior?.logs ?? [];
      },
    }),
    {
      name: 'recupero-behaviors',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 → v1: rename `xp` field to `xpEnabled` and drop the old key.
      migrate: (persistedState, version) => {
        if (version < 1) {
          const state = persistedState as BehaviorStore;
          return {
            ...state,
            behaviors: state.behaviors.map(b => {
              const { xp: legacyXp, ...rest } = b as BehaviorEntry & { xp?: true };
              return {
                ...rest,
                ...(legacyXp === true ? { xpEnabled: true as const } : {}),
              };
            }),
          };
        }
        return persistedState;
      },
    },
  ),
);
