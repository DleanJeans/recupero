import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEntry, BehaviorType, Category, MetadataField, StarPeriod } from '../types/behavior';
import type { AddTaskInput, TaskEntry } from '../types/task';
import { getLoggableDefaultMetadata } from '../utils/metadataCalculationUtils';
import { isTaskCompleteOnDate, timestampForTaskDate } from '../utils/taskUtils';

interface BehaviorStore {
  behaviors: BehaviorEntry[];
  categories: Category[];
  tasks: TaskEntry[];
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
    metadataAmountFieldKey?: string,
    starThresholds?: [number, number | null, number | null],
    starPeriod?: StarPeriod,
    xpEnabled?: true,
    xpDecay?: { every: number; unit: 'days' | 'weeks' | 'months' },
    cooldownEnabled?: boolean,
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
      cooldownEnabled?: boolean;
      private?: boolean;
      defaultMetadata?: Record<string, number>;
      metadataAmountFieldKey?: string;
      starThresholds?: [number, number | null, number | null] | undefined;
      starPeriod?: StarPeriod | undefined;
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
  addTask: (input: AddTaskInput) => void;
  updateTask: (taskId: string, updates: Partial<Pick<TaskEntry, 'title' | 'stars' | 'scheduledDate'>>) => void;
  toggleTaskCompletion: (taskId: string, dateStr: string) => void;
  removeTask: (taskId: string) => void;
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      behaviors: [],
      categories: [],
      tasks: [],
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
        metadataAmountFieldKey,
        starThresholds,
        starPeriod,
        xpEnabled,
        xpDecay,
        cooldownEnabled,
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
              metadataAmountFieldKey,
              logs: [],
              cooldownMinutes,
              cooldownType,
              cooldownUnit,
              cooldownEnabled,
              starThresholds,
              starPeriod,
              xpEnabled,
              xpDecay,
            },
          ],
        })),
      logBehavior: (id, timestamp, metadata = {}) =>
        set(state => ({
          behaviors: state.behaviors.map(t => {
            if (t.id !== id) return t;
            const newTimestamp = timestamp ?? Date.now();
            return {
              ...t,
              lastTimestamp: t.lastTimestamp === null ? newTimestamp : Math.max(t.lastTimestamp, newTimestamp),
              metadata: {
                ...t.metadata,
                ...metadata,
              },
              logs: [
                ...t.logs,
                {
                  id: uuidv4(),
                  timestamp: newTimestamp,
                  metadata,
                },
              ],
            };
          }),
        })),
      removeBehavior: id =>
        set(state => ({
          behaviors: state.behaviors.filter(t => t.id !== id),
          tasks: (state.tasks ?? []).map(task => (task.behaviorId === id ? { ...task, behaviorId: undefined } : task)),
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
      addTask: input =>
        set(state => ({
          tasks: [
            ...(state.tasks ?? []),
            {
              id: uuidv4(),
              title: input.title,
              scheduledDate: input.scheduledDate,
              stars: input.stars,
              source: input.source,
              behaviorId: input.behaviorId,
              completedDates: [],
              createdAt: Date.now(),
            },
          ],
        })),
      updateTask: (taskId, updates) =>
        set(state => ({
          tasks: (state.tasks ?? []).map(task => (task.id === taskId ? { ...task, ...updates } : task)),
        })),
      toggleTaskCompletion: (taskId, dateStr) =>
        set(state => {
          const task = (state.tasks ?? []).find(t => t.id === taskId);
          if (!task) return state;

          const wasComplete = isTaskCompleteOnDate(task, dateStr);
          const logIdToRemove = wasComplete ? task.completionLogIds?.[dateStr] : undefined;
          const logIdToAdd = !wasComplete && task.behaviorId ? uuidv4() : undefined;
          const taskTimestamp = timestampForTaskDate(dateStr);

          const tasks = (state.tasks ?? []).map(t => {
            if (t.id !== taskId) return t;
            if (wasComplete) {
              const { [dateStr]: _removedLogId, ...remainingLogIds } = t.completionLogIds ?? {};
              return {
                ...t,
                completedDates: t.completedDates.filter(date => date !== dateStr),
                completionLogIds: Object.keys(remainingLogIds).length > 0 ? remainingLogIds : undefined,
              };
            }
            return {
              ...t,
              completedDates: [...t.completedDates, dateStr],
              completionLogIds: logIdToAdd
                ? {
                    ...(t.completionLogIds ?? {}),
                    [dateStr]: logIdToAdd,
                  }
                : t.completionLogIds,
            };
          });

          const behaviors =
            task.behaviorId && logIdToAdd
              ? state.behaviors.map(b => {
                  if (b.id !== task.behaviorId) return b;
                  const category = b.categoryId ? state.categories.find(c => c.id === b.categoryId) : undefined;
                  const metadata = {
                    ...getLoggableDefaultMetadata(b.defaultMetadata, category?.metadataFields),
                    ...(task.source !== 'behavior' ? { notes: task.title } : {}),
                  };
                  return {
                    ...b,
                    lastTimestamp: b.lastTimestamp === null ? taskTimestamp : Math.max(b.lastTimestamp, taskTimestamp),
                    metadata: {
                      ...b.metadata,
                      ...metadata,
                    },
                    logs: [
                      ...b.logs,
                      {
                        id: logIdToAdd,
                        timestamp: taskTimestamp,
                        metadata,
                      },
                    ],
                  };
                })
              : task.behaviorId && logIdToRemove
                ? state.behaviors.map(b => {
                    if (b.id !== task.behaviorId) return b;
                    const logs = b.logs.filter(log => log.id !== logIdToRemove);
                    return {
                      ...b,
                      logs,
                      lastTimestamp: logs.length > 0 ? Math.max(...logs.map(log => log.timestamp)) : null,
                    };
                  })
                : state.behaviors;

          return { tasks, behaviors };
        }),
      removeTask: taskId =>
        set(state => ({
          tasks: (state.tasks ?? []).filter(task => task.id !== taskId),
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
      version: 3,
      // v0 → v1: rename `xp` field to `xpEnabled` and drop the old key.
      // v1 → v2: backfill `cooldownEnabled` from `cooldownMinutes` (old logs had no opt-in flag).
      // v2 → v3: add persisted tasks.
      migrate: (persistedState, version) => {
        let state = persistedState as BehaviorStore & { tasks?: TaskEntry[] };
        if (version < 1) {
          state = {
            ...state,
            behaviors: (state.behaviors ?? []).map(b => {
              const { xp: legacyXp, ...rest } = b as BehaviorEntry & { xp?: true };
              return {
                ...rest,
                ...(legacyXp === true ? { xpEnabled: true as const } : {}),
              };
            }),
          };
        }
        if (version < 2) {
          state = {
            ...state,
            behaviors: (state.behaviors ?? []).map(b => ({
              ...b,
              cooldownEnabled: b.cooldownEnabled ?? !!b.cooldownMinutes,
            })),
          };
        }
        if (version < 3) {
          state = {
            ...state,
            tasks: state.tasks ?? [],
          };
        }
        return state;
      },
    },
  ),
);
