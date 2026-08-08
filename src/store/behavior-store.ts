import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BehaviorEntry, BehaviorType, Category, MetadataField, StarPeriod } from '../types/behavior';
import type { AddTaskInput, TaskEntry } from '../types/task';
import { getLogEndTimestamp } from '../utils/log-utils';
import {
  getLoggableDefaultMetadata,
  getSelectedAmountMetadataField,
  syncBehaviorLogMetadata,
} from '../utils/metadata-calculation-utils';
import { DEFAULT_MONEY_REWARD } from '../utils/money-utils';
import { isTaskCompleteOnDate, timestampForTaskDate } from '../utils/task-utils';
import { useSettingsStore } from './settings-store';

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
    starMoneyMultipliers?: BehaviorEntry['starMoneyMultipliers'],
    xpEnabled?: true,
    xpDecay?: BehaviorEntry['xpDecay'],
    cooldownEnabled?: boolean,
    durationXpEnabled?: true,
    hideTotalXp?: true,
    moneyReward?: BehaviorEntry['moneyReward'],
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
      starMoneyMultipliers?: BehaviorEntry['starMoneyMultipliers'];
      xpEnabled?: true;
      xpDecay?: BehaviorEntry['xpDecay'];
      durationXpEnabled?: true;
      hideTotalXp?: true;
      moneyReward?: BehaviorEntry['moneyReward'];
    },
  ) => void;
  logBehavior: (
    id: string,
    timestamp?: number,
    metadata?: Record<string, string | number>,
    endTimestamp?: number,
  ) => void;
  removeBehavior: (id: string) => void;
  removeLog: (behaviorId: string, logId: string) => void;
  updateLog: (
    behaviorId: string,
    logId: string,
    timestamp: number,
    metadata?: Record<string, string | number>,
    endTimestamp?: number,
  ) => void;
  getBehaviorLogs: (behaviorId: string) => BehaviorEntry['logs'];
  addCategory: (name: string, emoji: string, metadataFields?: MetadataField[]) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, updates: { name?: string; emoji?: string; metadataFields?: MetadataField[] }) => void;
  updateCategoryMetadataFields: (id: string, metadataFields: MetadataField[]) => void;
  addTask: (input: AddTaskInput) => void;
  updateTask: (
    taskId: string,
    updates: Partial<Pick<TaskEntry, 'title' | 'stars' | 'scheduledDate' | 'source' | 'behaviorId'>>,
  ) => void;
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
        starMoneyMultipliers,
        xpEnabled,
        xpDecay,
        cooldownEnabled,
        durationXpEnabled,
        hideTotalXp,
        moneyReward,
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
              starMoneyMultipliers,
              xpEnabled,
              xpDecay,
              durationXpEnabled,
              hideTotalXp,
              moneyReward,
            },
          ],
        })),
      logBehavior: (id, timestamp, metadata = {}, endTimestamp) =>
        set(state => ({
          behaviors: state.behaviors.map(t => {
            if (t.id !== id) return t;
            const newTimestamp = timestamp ?? Date.now();
            const logLastTimestamp = endTimestamp ?? newTimestamp;
            return {
              ...t,
              lastTimestamp: t.lastTimestamp === null ? logLastTimestamp : Math.max(t.lastTimestamp, logLastTimestamp),
              metadata: {
                ...t.metadata,
                ...metadata,
              },
              logs: [
                ...t.logs,
                {
                  id: uuidv4(),
                  timestamp: newTimestamp,
                  endTimestamp,
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
                      ? Math.max(...b.logs.filter(log => log.id !== logId).map(log => getLogEndTimestamp(log)))
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
          behaviors: state.behaviors.map(b => {
            if (b.id !== behaviorId) return b;

            const nextBehavior = { ...b, ...updates };
            if (!Object.prototype.hasOwnProperty.call(updates, 'defaultMetadata')) return nextBehavior;

            const categoryId = Object.prototype.hasOwnProperty.call(updates, 'categoryId')
              ? updates.categoryId
              : b.categoryId;
            const category = categoryId ? state.categories.find(c => c.id === categoryId) : undefined;
            const fields = category?.metadataFields ?? [];
            const amountFieldKey = Object.prototype.hasOwnProperty.call(updates, 'metadataAmountFieldKey')
              ? updates.metadataAmountFieldKey
              : b.metadataAmountFieldKey;
            const amountField = getSelectedAmountMetadataField(fields, amountFieldKey, b.metadataQuantityUnit);

            return {
              ...nextBehavior,
              logs: b.logs.map(log => ({
                ...log,
                metadata: syncBehaviorLogMetadata({
                  metadata: log.metadata,
                  fields,
                  previousDefaultMetadata: b.defaultMetadata,
                  defaultMetadata: updates.defaultMetadata,
                  amountField,
                }),
              })),
            };
          }),
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
        set(state => {
          const task = (state.tasks ?? []).find(candidate => candidate.id === taskId);
          if (!task) return state;

          const safeUpdates =
            task.completedDates.length > 0 ? { ...updates, behaviorId: task.behaviorId, source: task.source } : updates;
          return {
            tasks: (state.tasks ?? []).map(candidate =>
              candidate.id === taskId ? { ...candidate, ...safeUpdates } : candidate,
            ),
          };
        }),
      toggleTaskCompletion: (taskId, dateStr) =>
        set(state => {
          const task = (state.tasks ?? []).find(t => t.id === taskId);
          if (!task) return state;

          const wasComplete = isTaskCompleteOnDate(task, dateStr);
          const logIdToRemove = wasComplete ? task.completionLogIds?.[dateStr] : undefined;
          const logIdToAdd = !wasComplete && task.behaviorId ? uuidv4() : undefined;
          const dayCutoffHour = useSettingsStore.getState().dayCutoffHour;
          const taskTimestamp = timestampForTaskDate(dateStr, dayCutoffHour);

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
                      lastTimestamp: logs.length > 0 ? Math.max(...logs.map(log => getLogEndTimestamp(log))) : null,
                    };
                  })
                : state.behaviors;

          return { tasks, behaviors };
        }),
      removeTask: taskId =>
        set(state => {
          const task = (state.tasks ?? []).find(candidate => candidate.id === taskId);
          if (!task) return state;

          const completionLogIds = new Set(Object.values(task.completionLogIds ?? {}));
          const behaviors =
            completionLogIds.size === 0
              ? state.behaviors
              : state.behaviors.map(behavior => {
                  const logs = behavior.logs.filter(log => !completionLogIds.has(log.id));
                  return logs.length === behavior.logs.length
                    ? behavior
                    : {
                        ...behavior,
                        logs,
                        lastTimestamp: logs.length > 0 ? Math.max(...logs.map(log => getLogEndTimestamp(log))) : null,
                      };
                });

          return {
            tasks: (state.tasks ?? []).filter(candidate => candidate.id !== taskId),
            behaviors,
          };
        }),
      updateLog: (behaviorId, logId, timestamp, metadata, endTimestamp) =>
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
                          endTimestamp,
                          metadata: metadata ?? log.metadata,
                        }
                      : log,
                  ),
                  lastTimestamp: Math.max(
                    ...b.logs.map(log => (log.id === logId ? (endTimestamp ?? timestamp) : getLogEndTimestamp(log))),
                  ),
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
      version: 5,
      // v0 → v1: rename `xp` field to `xpEnabled` and drop the old key.
      // v1 → v2: backfill `cooldownEnabled` from `cooldownMinutes` (old logs had no opt-in flag).
      // v2 → v3: add persisted tasks.
      // v3 → v4: opt existing behaviors into retrospective money effects.
      // v4 → v5: replace the legacy money opt-in with editable default rates.
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
        if (version < 4) {
          state = {
            ...state,
            behaviors: (state.behaviors ?? []).map(b => ({
              ...b,
              moneyReward: true as const,
            })),
          };
        }
        if (version < 5) {
          state = {
            ...state,
            behaviors: (state.behaviors ?? []).map(b =>
              b.moneyReward === true
                ? {
                    ...b,
                    moneyReward: { ...DEFAULT_MONEY_REWARD },
                  }
                : b,
            ),
          };
        }
        return state;
      },
    },
  ),
);
