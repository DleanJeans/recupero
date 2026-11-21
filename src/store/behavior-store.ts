import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppUsageSession, SiteSession } from '../types/app-usage';
import type {
  AutoTrackApp,
  AutoTrackSite,
  BehaviorEntry,
  BehaviorType,
  Category,
  MealBatch,
  MetadataField,
  StarPeriod,
} from '../types/behavior';
import type { CueRef } from '../types/cue';
import type { HealthSleep } from '../types/health';
import type { AddTaskInput, TaskEntry } from '../types/task';
import { mergeCloseAutoLogs, mergeTrackedSessionsIntoLogs, siteMatchesDomain } from '../utils/app-usage-utils';
import { getGroupKey } from '../utils/behavior-group-utils';
import { mergeSleepIntoLogs } from '../utils/google-health-utils';
import { getLogEndTimestamp } from '../utils/log-utils';
import { syncBatchIngredientLogs } from '../utils/meal-batch-utils';
import {
  getLoggableDefaultMetadata,
  getMetadataRateBasis,
  getSelectedAmountMetadataField,
  syncBehaviorLogMetadata,
} from '../utils/metadata-calculation-utils';
import { DEFAULT_MONEY_REWARD } from '../utils/money-utils';
import { isTaskCompleteOnDate, timestampForTaskDate } from '../utils/task-utils';
import { toggleSkippedDate } from '../utils/weekly-goal-utils';
import { useCuesStore } from './cues-store';
import { useSettingsStore } from './settings-store';

interface BehaviorStore {
  behaviors: BehaviorEntry[];
  categories: Category[];
  tasks: TaskEntry[];
  /** Emoji per behaviour group, keyed by lower-case group name (see `getGroupKey`). Missing = use a member's icon. */
  groupEmojis: Record<string, string>;
  setGroupEmoji: (groupName: string, emoji: string | undefined) => void;
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
    autoTrackApp?: AutoTrackApp,
    autoTrackSite?: AutoTrackSite,
    group?: string,
    metadataRateBasis?: number,
  ) => void;
  /** Creates the behaviour for a cooked batch (see `MealBatch`) and returns its id. */
  addBatchBehavior: (input: {
    name: string;
    icon?: string;
    type: BehaviorType;
    categoryId: string;
    metadataAmountFieldKey?: string;
    defaultMetadata: Record<string, number>;
    batch: MealBatch;
    /** Cooking time of the base behaviour (its stopped timer), logged there and linked to the new batch. */
    baseTime?: { start: number; end: number };
  }) => string;
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
      metadataRateBasis?: number | undefined;
      starThresholds?: [number, number | null, number | null] | undefined;
      starPeriod?: StarPeriod | undefined;
      starMoneyMultipliers?: BehaviorEntry['starMoneyMultipliers'];
      xpEnabled?: true;
      xpDecay?: BehaviorEntry['xpDecay'];
      durationXpEnabled?: true;
      hideTotalXp?: true;
      moneyReward?: BehaviorEntry['moneyReward'];
      autoTrackApp?: AutoTrackApp | undefined;
      autoTrackSite?: AutoTrackSite | undefined;
      group?: string | undefined;
      batch?: MealBatch;
    },
  ) => void;
  /** Turns app sessions and Firefox site visits into logs for behaviors that auto-track them, then marks them synced. */
  applyAppUsageSessions: (
    appSessions: AppUsageSession[],
    siteSessions: SiteSession[],
    syncedUntil: number,
    mediaSessions?: AppUsageSession[],
  ) => void;
  /** One-time (and repeatable) clean-up: joins back-to-back auto logs closer than `gapMs`. */
  mergeCloseAppUsageLogs: (gapMs: number, protectedIds?: ReadonlySet<string>) => void;
  /** Logs synced sleeps to a behaviour (deduped by data point id). Returns the updated imported ids. */
  applyHealthSleeps: (behaviorId: string, sleeps: HealthSleep[], importedIds: string[]) => string[];
  logBehavior: (
    id: string,
    timestamp?: number,
    metadata?: Record<string, string | number>,
    endTimestamp?: number,
    cues?: CueRef[],
    /** Links logs saved together with habit stacking. */
    stackId?: string,
  ) => string;
  removeBehavior: (id: string) => void;
  /** Hides a behaviour from lists, pickers and suggestions without touching its logs. */
  archiveBehavior: (id: string) => void;
  unarchiveBehavior: (id: string) => void;
  removeLog: (behaviorId: string, logId: string) => void;
  updateLog: (
    behaviorId: string,
    logId: string,
    timestamp: number,
    metadata?: Record<string, string | number>,
    endTimestamp?: number,
    /** Omit to keep the log's cues; pass [] to clear them. */
    cues?: CueRef[],
  ) => void;
  getBehaviorLogs: (behaviorId: string) => BehaviorEntry['logs'];
  addCategory: (name: string, emoji: string, metadataFields?: MetadataField[]) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, updates: { name?: string; emoji?: string; metadataFields?: MetadataField[] }) => void;
  updateCategoryMetadataFields: (id: string, metadataFields: MetadataField[]) => void;
  /** Leaves a date out of (or back in) the category's 7-day goal averages. */
  toggleCategoryGoalSkippedDate: (id: string, date: string) => void;
  addTask: (input: AddTaskInput) => void;
  updateTask: (
    taskId: string,
    updates: Partial<
      Pick<
        TaskEntry,
        | 'title'
        | 'stars'
        | 'scheduledDate'
        | 'source'
        | 'behaviorId'
        | 'placeId'
        | 'placeDwellMin'
        | 'appPackage'
        | 'appLabel'
        | 'timed'
        | 'list'
      >
    >,
  ) => void;
  /** `timed` (a running task timer) makes the completion log span that time instead of being a single tick. */
  toggleTaskCompletion: (taskId: string, dateStr: string, timed?: { start: number; end: number }) => void;
  /** Pick or unpick a task as one of "Today's 3" for the date. */
  toggleTaskFocus: (taskId: string, dateStr: string) => void;
  removeTask: (taskId: string) => void;
}

function applyBehaviorUpdates(
  state: Pick<BehaviorStore, 'behaviors' | 'categories'>,
  behaviorId: string,
  updates: Parameters<BehaviorStore['updateBehavior']>[1],
): BehaviorEntry[] {
  return state.behaviors.map(b => {
    if (b.id !== behaviorId) return b;

    const nextBehavior = { ...b, ...updates };
    const rateBasisChanged =
      Object.prototype.hasOwnProperty.call(updates, 'metadataRateBasis') &&
      getMetadataRateBasis(updates) !== getMetadataRateBasis(b);
    if (!Object.prototype.hasOwnProperty.call(updates, 'defaultMetadata') && !rateBasisChanged) return nextBehavior;

    const categoryId = Object.prototype.hasOwnProperty.call(updates, 'categoryId') ? updates.categoryId : b.categoryId;
    const category = categoryId ? state.categories.find(c => c.id === categoryId) : undefined;
    const fields = category?.metadataFields ?? [];
    const amountFieldKey = Object.prototype.hasOwnProperty.call(updates, 'metadataAmountFieldKey')
      ? updates.metadataAmountFieldKey
      : b.metadataAmountFieldKey;
    const amountField = getSelectedAmountMetadataField(fields, amountFieldKey, b.metadataQuantityUnit);

    return {
      ...nextBehavior,
      logs: b.logs.map(log =>
        log.batchBehaviorId
          ? log
          : {
              ...log,
              metadata: syncBehaviorLogMetadata({
                metadata: log.metadata,
                fields,
                previousDefaultMetadata: b.defaultMetadata,
                defaultMetadata: nextBehavior.defaultMetadata,
                amountField,
                rateBasis: nextBehavior.metadataRateBasis,
              }),
            },
      ),
    };
  });
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      behaviors: [],
      categories: [],
      tasks: [],
      groupEmojis: {},
      setGroupEmoji: (groupName, emoji) =>
        set(state => {
          const key = getGroupKey(groupName);
          if (!key) return state;
          const { [key]: _previous, ...rest } = state.groupEmojis ?? {};
          return { groupEmojis: emoji ? { ...rest, [key]: emoji } : rest };
        }),
      addBatchBehavior: input => {
        const id = uuidv4();
        const { baseTime } = input;
        const baseId = input.batch.baseBehaviorId;
        set(state => ({
          behaviors: syncBatchIngredientLogs(
            [
              ...state.behaviors.map(behavior =>
                baseTime && behavior.id === baseId
                  ? {
                      ...behavior,
                      lastTimestamp: Math.max(behavior.lastTimestamp ?? 0, baseTime.end),
                      logs: [
                        ...behavior.logs,
                        {
                          id: uuidv4(),
                          timestamp: baseTime.start,
                          endTimestamp: baseTime.end,
                          metadata: {},
                          cookBatchId: id,
                        },
                      ],
                    }
                  : behavior,
              ),
              {
                id,
                name: input.name,
                type: input.type,
                icon: input.icon,
                categoryId: input.categoryId,
                lastTimestamp: null,
                metadata: {},
                defaultMetadata: input.defaultMetadata,
                metadataAmountFieldKey: input.metadataAmountFieldKey,
                logs: [],
                cooldownMinutes: 0,
                cooldownType: 'rest',
                batch: input.batch,
              },
            ],
            state.categories,
            id,
            uuidv4,
          ),
        }));
        return id;
      },
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
        autoTrackApp,
        autoTrackSite,
        group,
        metadataRateBasis,
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
              metadataRateBasis,
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
              autoTrackApp,
              autoTrackSite,
              ...(group ? { group } : {}),
            },
          ],
        })),
      logBehavior: (id, timestamp, metadata = {}, endTimestamp, cues, stackId) => {
        const logId = uuidv4();
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
                  id: logId,
                  timestamp: newTimestamp,
                  endTimestamp,
                  metadata,
                  ...(cues && cues.length > 0 ? { cues } : {}),
                  ...(stackId ? { stackId } : {}),
                },
              ],
            };
          }),
        }));
        return logId;
      },
      applyAppUsageSessions: (appSessions, siteSessions, syncedUntil, mediaSessions = []) => {
        const mergeGapMs = useSettingsStore.getState().appLogMergeGapMin * 60_000;
        set(state => ({
          behaviors: state.behaviors.map(b => {
            const { autoTrackApp: app, autoTrackSite: site } = b;
            if (!app && !site) return b;
            let logs = b.logs;
            if (app) {
              const sessions = (app.mediaOnly ? mediaSessions : appSessions).filter(
                session => session.packageName === app.packageName,
              );
              logs = mergeTrackedSessionsIntoLogs(logs, sessions, app.syncedUntil, uuidv4, { gapMs: mergeGapMs }).logs;
            }
            if (site) {
              const sessions = siteSessions.filter(session => siteMatchesDomain(session.host, site.domain));
              logs = mergeTrackedSessionsIntoLogs(logs, sessions, site.syncedUntil, uuidv4, {
                source: 'site-visit',
                gapMs: mergeGapMs,
              }).logs;
            }
            return {
              ...b,
              lastTimestamp:
                logs === b.logs
                  ? b.lastTimestamp
                  : Math.max(b.lastTimestamp ?? 0, ...logs.map(log => getLogEndTimestamp(log))),
              logs,
              autoTrackApp: app && { ...app, syncedUntil: Math.max(app.syncedUntil, syncedUntil) },
              autoTrackSite: site && { ...site, syncedUntil: Math.max(site.syncedUntil, syncedUntil) },
            };
          }),
        }));
      },
      mergeCloseAppUsageLogs: (gapMs, protectedIds) =>
        set(state => {
          let changed = false;
          const behaviors = state.behaviors.map(b => {
            if (!b.autoTrackApp && !b.autoTrackSite) return b;
            const result = mergeCloseAutoLogs(b.logs, gapMs, protectedIds);
            if (!result.changed) return b;
            changed = true;
            return { ...b, logs: result.logs };
          });
          return changed ? { behaviors } : state;
        }),
      applyHealthSleeps: (behaviorId, sleeps, importedIds) => {
        const behavior = get().behaviors.find(b => b.id === behaviorId);
        if (!behavior) return importedIds;
        const result = mergeSleepIntoLogs(behavior.logs, sleeps, importedIds, uuidv4);
        if (result.changed) {
          set(state => ({
            behaviors: state.behaviors.map(b =>
              b.id === behaviorId
                ? {
                    ...b,
                    logs: result.logs,
                    lastTimestamp: Math.max(b.lastTimestamp ?? 0, ...result.logs.map(log => getLogEndTimestamp(log))),
                  }
                : b,
            ),
          }));
        }
        return result.importedIds;
      },
      removeBehavior: id =>
        set(state => {
          useCuesStore.getState().removeBehaviorReferences(id);
          return {
            behaviors: state.behaviors.filter(t => t.id !== id),
            tasks: (state.tasks ?? []).map(task =>
              task.behaviorId === id ? { ...task, behaviorId: undefined } : task,
            ),
          };
        }),
      archiveBehavior: id =>
        set(state => ({
          behaviors: state.behaviors.map(b => (b.id === id ? { ...b, archivedAt: Date.now() } : b)),
        })),
      unarchiveBehavior: id =>
        set(state => ({
          behaviors: state.behaviors.map(b => {
            if (b.id !== id) return b;
            const { archivedAt: _archivedAt, ...rest } = b;
            return rest;
          }),
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
        set(state => {
          const updated = applyBehaviorUpdates(state, behaviorId, updates);
          return {
            behaviors: updates.batch ? syncBatchIngredientLogs(updated, state.categories, behaviorId, uuidv4) : updated,
          };
        }),
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
      toggleCategoryGoalSkippedDate: (id, date) =>
        set(state => ({
          categories: state.categories.map(c =>
            c.id === id ? { ...c, goalSkippedDates: toggleSkippedDate(c.goalSkippedDates, date) } : c,
          ),
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
              placeId: input.placeId,
              placeDwellMin: input.placeDwellMin,
              appPackage: input.appPackage,
              appLabel: input.appLabel,
              timed: input.timed,
              list: input.list,
              completedDates: [],
              completedAtByDate: undefined,
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
      toggleTaskFocus: (taskId, dateStr) =>
        set(state => ({
          tasks: (state.tasks ?? []).map(task => {
            if (task.id !== taskId) return task;
            const focusDates = task.focusDates ?? [];
            const next = focusDates.includes(dateStr)
              ? focusDates.filter(date => date !== dateStr)
              : [...focusDates, dateStr];
            return { ...task, focusDates: next.length > 0 ? next : undefined };
          }),
        })),
      toggleTaskCompletion: (taskId, dateStr, timed) =>
        set(state => {
          const task = (state.tasks ?? []).find(t => t.id === taskId);
          if (!task) return state;

          const wasComplete = isTaskCompleteOnDate(task, dateStr);
          const logIdToRemove = wasComplete ? task.completionLogIds?.[dateStr] : undefined;
          const logIdToAdd = !wasComplete && task.behaviorId ? uuidv4() : undefined;
          const dayCutoffHour = useSettingsStore.getState().dayCutoffHour;
          const taskTimestamp = timed && !wasComplete ? timed.end : timestampForTaskDate(dateStr, dayCutoffHour);
          const logStart = timed && !wasComplete ? timed.start : taskTimestamp;

          const tasks = (state.tasks ?? []).map(t => {
            if (t.id !== taskId) return t;
            if (wasComplete) {
              const { [dateStr]: _removedLogId, ...remainingLogIds } = t.completionLogIds ?? {};
              const { [dateStr]: _removedCompletedAt, ...remainingCompletedAt } = t.completedAtByDate ?? {};
              return {
                ...t,
                completedDates: t.completedDates.filter(date => date !== dateStr),
                completedAtByDate: Object.keys(remainingCompletedAt).length > 0 ? remainingCompletedAt : undefined,
                completionLogIds: Object.keys(remainingLogIds).length > 0 ? remainingLogIds : undefined,
              };
            }
            return {
              ...t,
              completedDates: [...t.completedDates, dateStr],
              completedAtByDate: {
                ...(t.completedAtByDate ?? {}),
                [dateStr]: taskTimestamp,
              },
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
                        timestamp: logStart,
                        ...(logStart < taskTimestamp ? { endTimestamp: taskTimestamp } : {}),
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
      updateLog: (behaviorId, logId, timestamp, metadata, endTimestamp, cues) =>
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
                          ...(log.source ? { editedAt: Date.now() } : {}),
                          metadata: metadata ?? log.metadata,
                          cues: cues === undefined ? log.cues : cues.length > 0 ? cues : undefined,
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
      version: 7,
      // v0 → v1: rename `xp` field to `xpEnabled` and drop the old key.
      // v1 → v2: backfill `cooldownEnabled` from `cooldownMinutes` (old logs had no opt-in flag).
      // v2 → v3: add persisted tasks.
      // v3 → v4: opt existing behaviors into retrospective money effects.
      // v4 → v5: replace the legacy money opt-in with editable default rates.
      // v5 → v6: give the ingredients of existing meal batches a log each.
      // v6 → v7: every task pays stars now, so open tasks that had 0 stars (linked to a behavior) get 1.
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
        if (version < 6) {
          let behaviors = state.behaviors ?? [];
          for (const batchBehavior of behaviors.filter(b => b.batch)) {
            behaviors = syncBatchIngredientLogs(behaviors, state.categories ?? [], batchBehavior.id, uuidv4);
          }
          state = { ...state, behaviors };
        }
        if (version < 7) {
          state = {
            ...state,
            tasks: (state.tasks ?? []).map(task =>
              task.stars === 0 && task.completedDates.length === 0 ? { ...task, stars: 1 as const } : task,
            ),
          };
        }
        return state;
      },
    },
  ),
);
