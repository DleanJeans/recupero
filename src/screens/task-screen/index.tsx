import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppUsage, type LaunchableApp } from '../../../modules/app-usage';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { TabHeader } from '../../components/tab-header';
import { Text } from '../../components/text';
import { useDeferredComputation } from '../../hooks/use-deferred-computation';
import { useFabCollapse } from '../../hooks/use-fab-collapse';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { resyncReminders } from '../../hooks/use-reminder-engine';
import { useTaskTimeSpent } from '../../hooks/use-task-time-spent';
import { useTaskTimerIds } from '../../hooks/use-task-timer-ids';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCuesStore } from '../../store/cues-store';
import { type TaskTab, useScreenUiStore } from '../../store/screen-ui-store';
import { useSettingsStore } from '../../store/settings-store';
import { useTimerStore } from '../../store/timer-store';
import type { RootStackParamList } from '../../types/navigation';
import type { NeedId } from '../../types/need';
import type { OneOffPlace, TaskBug, TaskEntry, TaskList } from '../../types/task';
import { ensureAppBehavior } from '../../utils/app-behavior';
import { syncAppUsage } from '../../utils/app-usage-sync';
import { getActiveBehaviors } from '../../utils/archive-utils';
import { getCalendarTaskCompletionMetrics } from '../../utils/calendar-metrics';
import { Colors } from '../../utils/colors';
import { formatDateDisplay, toDateString } from '../../utils/date-utils';
import { getNeedLowForecasts } from '../../utils/need-utils';
import { DEFAULT_PLACE_DWELL_MIN, getPlaceDwellMin } from '../../utils/place-task-utils';
import { requestPlaceTaskPermissions } from '../../utils/reminder-permissions';
import { buildBatchUpdates, type TaskBatchEdits } from '../../utils/task-batch-utils';
import { getBugNudgeTask, getFixFirstTasks, sortByBugHeat } from '../../utils/task-bug-utils';
import {
  getSuggestedStartTime,
  isStartPassed,
  sortByCompletion,
  sortByStartTime,
} from '../../utils/task-schedule-utils';
import {
  getFocusStreak,
  getFocusTasksForDate,
  getTaskList,
  getTasksForDate,
  hasFocusBonusOnDate,
  isTaskCompleteOnDate,
  isTaskFocusedOn,
  isTaskVisibleOnDate,
  TODAY_FOCUS_LIMIT,
} from '../../utils/task-utils';
import { DateNavigationRow } from '../components/date-navigation-row';
import { AddBehaviorFab } from '../home-screen/components/add-behavior-fab';
import { BugHistorySheet } from './components/bug-history-sheet';
import { BugLogSheet } from './components/bug-log-sheet';
import { BugNudgeCard } from './components/bug-nudge-card';
import { FocusStreakStrip } from './components/focus-streak-strip';
import { TaskActionSheet } from './components/task-action-sheet';
import { TaskBatchEditDialog } from './components/task-batch-edit-dialog';
import { TaskCard } from './components/task-card';
import { TaskEditorDialog } from './components/task-editor-dialog';
import { TaskNeedLowNode } from './components/task-need-low-node';
import type { TaskSchedule } from './components/task-schedule-rows';
import { TaskSelectionBar } from './components/task-selection-bar';
import { TaskTabs } from './components/task-tabs';
import { TaskTimelineNow } from './components/task-timeline-now';
import { TaskTimelineRow } from './components/task-timeline-row';
import { type TodayPickCandidate, TodayPickSheet } from './components/today-pick-sheet';

const LIST_ORDER: Record<TaskList, number> = { next: 0, shopping: 1, someday: 2 };
const GOT_IT_LIMIT = 20;
const FAB_LABELS: Record<TaskTab, string> = { today: 'Add task', shopping: 'Add to buy', later: 'Add idea' };
const TAB_LIST: Record<TaskTab, TaskList | undefined> = { today: undefined, shopping: 'shopping', later: 'someday' };

function lastCompletedDate(task: TaskEntry): string | undefined {
  return [...task.completedDates].sort().at(-1);
}

export function TaskScreen() {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const todayStr = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour]);
  const taskScreenSelectedDate = useScreenUiStore(s => s.taskScreenSelectedDate);
  const setSelectedDate = useScreenUiStore(s => s.setTaskScreenSelectedDate);
  const tab = useScreenUiStore(s => s.taskScreenTab);
  const sort = useScreenUiStore(s => s.taskScreenSort);
  const setSort = useScreenUiStore(s => s.setTaskScreenSort);
  const setTaskTab = useScreenUiStore(s => s.setTaskScreenTab);
  const setTab = useCallback(
    (next: TaskTab) => {
      setSelectedIds(undefined);
      setTaskTab(next);
    },
    [setTaskTab],
  );
  const selectedDate = taskScreenSelectedDate ?? todayStr;
  const [title, setTitle] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [oneOffPlace, setOneOffPlace] = useState<OneOffPlace | undefined>();
  const [placeDwellMin, setPlaceDwellMin] = useState(DEFAULT_PLACE_DWELL_MIN);
  const [selectedApp, setSelectedApp] = useState<LaunchableApp>();
  const [timed, setTimed] = useState(false);
  const [icon, setIcon] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const taskTimerIds = useTaskTimerIds();
  const [now, setNow] = useState(() => new Date());
  const { needs: needLevels } = useNeedLevels();
  const [schedule, setSchedule] = useState<TaskSchedule>({ scheduledDate: todayStr });
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [menuTaskId, setMenuTaskId] = useState<string | undefined>();
  const [pickOpen, setPickOpen] = useState(false);
  /** Task whose "Bugged me" log sheet / bug history is open. */
  const [bugTaskId, setBugTaskId] = useState<string | undefined>();
  const [historyTaskId, setHistoryTaskId] = useState<string | undefined>();
  /** Select mode: ids of the picked tasks (undefined = not selecting). */
  const [selectedIds, setSelectedIds] = useState<string[]>();
  const [batchOpen, setBatchOpen] = useState(false);
  const selecting = selectedIds !== undefined;
  const { collapsed: fabCollapsed, onScroll } = useFabCollapse();

  const behaviors = useBehaviorStore(s => s.behaviors);
  const timeSpent = useTaskTimeSpent();
  const tasks = useBehaviorStore(s => s.tasks);
  const addTask = useBehaviorStore(s => s.addTask);
  const updateTask = useBehaviorStore(s => s.updateTask);
  const removeTask = useBehaviorStore(s => s.removeTask);
  const toggleTaskCompletion = useBehaviorStore(s => s.toggleTaskCompletion);
  const toggleTaskFocus = useBehaviorStore(s => s.toggleTaskFocus);
  const addTaskBug = useBehaviorStore(s => s.addTaskBug);
  const removeTaskBug = useBehaviorStore(s => s.removeTaskBug);
  const dismissTaskBugNudge = useBehaviorStore(s => s.dismissTaskBugNudge);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const shoppingTimerApp = useSettingsStore(s => s.shoppingTimerApp);
  const places = useCuesStore(s => s.places);
  const placeById = useMemo(() => new Map(places.map(place => [place.id, place])), [places]);

  const availableBehaviors = useMemo(() => {
    if (!composerOpen && !batchOpen) return [];
    const active = getActiveBehaviors(behaviors);
    const visible = hidePrivate ? active.filter(behavior => !behavior.private) : active;
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, composerOpen, batchOpen, hidePrivate]);
  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);
  const behaviorOf = useCallback(
    (task: TaskEntry) => (task.behaviorId ? behaviorById.get(task.behaviorId) : undefined),
    [behaviorById],
  );
  const listOf = useCallback((task: TaskEntry) => getTaskList(task, behaviorOf(task)), [behaviorOf]);

  // Picks can be made for today and later days only, so a past day's bonus can't be earned after the fact.
  const canPick = selectedDate >= todayStr;
  const focusDate = canPick ? selectedDate : todayStr;

  const focusTasks = useMemo(
    () =>
      getFocusTasksForDate(tasks, selectedDate).filter(task => isTaskVisibleOnDate(task, selectedDate, dayCutoffHour)),
    [tasks, selectedDate, dayCutoffHour],
  );
  const isToday = selectedDate === todayStr;
  useEffect(() => {
    if (!isToday || tab !== 'today') return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [isToday, tab]);
  // Hot tasks (from any tab but Later) that are not already picked for today.
  const fixFirstTasks = useMemo(
    () =>
      isToday
        ? getFixFirstTasks(
            tasks ?? [],
            Date.now(),
            task => !isTaskFocusedOn(task, todayStr) && listOf(task) !== 'someday',
          )
        : [],
    [isToday, tasks, todayStr, listOf],
  );
  const bugNudgeTask = useMemo(
    () =>
      isToday
        ? getBugNudgeTask(
            tasks ?? [],
            Date.now(),
            task => !isTaskFocusedOn(task, todayStr) && listOf(task) !== 'someday',
          )
        : undefined,
    [isToday, tasks, todayStr, listOf],
  );
  /** Oldest first (the default) or hottest first. Done tasks stay at the bottom. */
  const sortOpenFirst = useCallback(
    (list: TaskEntry[], isDone: (task: TaskEntry) => boolean) => {
      if (sort !== 'heat') return list;
      return [
        ...sortByBugHeat(
          list.filter(task => !isDone(task)),
          Date.now(),
        ),
        ...list.filter(isDone),
      ];
    },
    [sort],
  );
  const nextUpTasks = useMemo(
    () =>
      sortOpenFirst(
        getTasksForDate(tasks, selectedDate, dayCutoffHour).filter(
          task =>
            !isTaskFocusedOn(task, selectedDate) &&
            listOf(task) === 'next' &&
            !fixFirstTasks.some(hot => hot.id === task.id),
        ),
        task => isTaskCompleteOnDate(task, selectedDate),
      ),
    [tasks, selectedDate, dayCutoffHour, listOf, fixFirstTasks, sortOpenFirst],
  );
  /** Needs that will turn low before the day ends, shown on today's timeline (needs already low are left out). */
  const needForecasts = useMemo(() => {
    if (!isToday) return [];
    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(dayCutoffHour, 0, 0, 0);
    return getNeedLowForecasts(needLevels, now.getTime(), dayEnd.getTime());
  }, [isToday, needLevels, now, dayCutoffHour]);

  /** Today timeline: done tasks (in the order ticked) above "Now", open ones below by start time. */
  const timelineTasks = useMemo(() => {
    const seen = new Set<string>();
    const all = [...focusTasks, ...nextUpTasks].filter(task => !seen.has(task.id) && seen.add(task.id));
    const done = all.filter(task => isTaskCompleteOnDate(task, selectedDate));
    const open = all.filter(task => !isTaskCompleteOnDate(task, selectedDate));
    return { done: sortByCompletion(done, selectedDate), open: sortByStartTime(open) };
  }, [focusTasks, nextUpTasks, selectedDate]);
  const shoppingTasks = useMemo(
    () => (tasks ?? []).filter(task => !task.archived && listOf(task) === 'shopping'),
    [tasks, listOf],
  );
  const toBuyTasks = useMemo(
    () =>
      sortOpenFirst(
        shoppingTasks.filter(task => task.completedDates.length === 0).sort((a, b) => a.createdAt - b.createdAt),
        () => false,
      ),
    [shoppingTasks, sortOpenFirst],
  );
  const gotItTasks = useMemo(
    () =>
      shoppingTasks
        .filter(task => task.completedDates.length > 0)
        .sort((a, b) => (lastCompletedDate(b) ?? '').localeCompare(lastCompletedDate(a) ?? ''))
        .slice(0, GOT_IT_LIMIT),
    [shoppingTasks],
  );
  const laterTasks = useMemo(
    () =>
      sortOpenFirst(
        (tasks ?? [])
          .filter(task => !task.archived && task.completedDates.length === 0 && listOf(task) === 'someday')
          .sort((a, b) => a.createdAt - b.createdAt),
        () => false,
      ),
    [tasks, listOf, sortOpenFirst],
  );

  const focusDoneCount = focusTasks.filter(task => isTaskCompleteOnDate(task, selectedDate)).length;
  const bonusEarned = useMemo(() => hasFocusBonusOnDate(tasks, selectedDate), [tasks, selectedDate]);
  const streak = useMemo(() => getFocusStreak(tasks, todayStr), [tasks, todayStr]);
  const calendarDayMetrics = useDeferredComputation(() => getCalendarTaskCompletionMetrics(tasks), [tasks]);
  const openNextUpCount = nextUpTasks.filter(task => !isTaskCompleteOnDate(task, selectedDate)).length;
  const tabCounts: Record<TaskTab, number> = {
    today: focusTasks.length > 0 ? focusTasks.length - focusDoneCount : openNextUpCount,
    shopping: toBuyTasks.length,
    later: laterTasks.length,
  };

  const pickCandidates = useMemo<TodayPickCandidate[]>(() => {
    if (!pickOpen) return [];
    return (tasks ?? [])
      .filter(task => !task.archived && (isTaskFocusedOn(task, focusDate) || task.completedDates.length === 0))
      .map(task => ({ task, list: listOf(task), picked: isTaskFocusedOn(task, focusDate) }))
      .sort(
        (a, b) =>
          Number(b.picked) - Number(a.picked) ||
          LIST_ORDER[a.list] - LIST_ORDER[b.list] ||
          a.task.createdAt - b.task.createdAt,
      );
  }, [pickOpen, tasks, focusDate, listOf]);
  const focusCountForPickDate = useMemo(() => getFocusTasksForDate(tasks, focusDate).length, [tasks, focusDate]);

  const selectedBehavior = selectedBehaviorId ? behaviorById.get(selectedBehaviorId) : undefined;
  const editingTask = editingTaskId ? (tasks ?? []).find(task => task.id === editingTaskId) : undefined;
  const bugTask = bugTaskId ? (tasks ?? []).find(task => task.id === bugTaskId) : undefined;
  const historyTask = historyTaskId ? (tasks ?? []).find(task => task.id === historyTaskId) : undefined;
  const menuTask = menuTaskId ? (tasks ?? []).find(task => task.id === menuTaskId) : undefined;

  const resetComposer = () => {
    setTitle('');
    setSelectedBehaviorId(undefined);
    setSelectedApp(undefined);
    setTimed(false);
    setIcon('');
    setSchedule({ scheduledDate: tab === 'today' ? selectedDate : todayStr });
    setSelectedPlaceId(undefined);
    setOneOffPlace(undefined);
    setPlaceDwellMin(DEFAULT_PLACE_DWELL_MIN);
    setEditingTaskId(undefined);
  };

  const closeComposer = () => {
    resetComposer();
    setComposerOpen(false);
  };

  const handleSubmitTask = async () => {
    const trimmedTitle = title.trim();
    const app = selectedApp;
    const taskTitle = trimmedTitle || selectedBehavior?.name.trim() || app?.label || '';
    if (!taskTitle) return;
    const isTimed = timed && (selectedBehavior != null || app != null);
    // Picking an app makes (or reuses) the behavior that tracks it, shared with Needs.
    const appBehaviorId = app ? await ensureAppBehavior(app, { trackDuration: true }) : undefined;
    const behaviorId = selectedBehavior?.id ?? appBehaviorId;
    const isBehaviorOnlyTask = !trimmedTitle && behaviorId != null;
    const savedPlaceId = selectedPlaceId != null && placeById.has(selectedPlaceId) ? selectedPlaceId : undefined;
    const taskOneOffPlace = savedPlaceId ? undefined : oneOffPlace;
    const hasPlace = savedPlaceId != null || taskOneOffPlace != null;
    const nextTask = {
      title: taskTitle,
      stars: editingTask && editingTask.stars > 0 ? editingTask.stars : (1 as const),
      source: isBehaviorOnlyTask ? ('behavior' as const) : ('oneOff' as const),
      behaviorId,
      placeId: savedPlaceId,
      oneOffPlace: taskOneOffPlace,
      placeDwellMin: hasPlace ? placeDwellMin : undefined,
      appPackage: app?.packageName,
      appLabel: app?.label,
      timed: isTimed ? (true as const) : undefined,
      icon: icon || undefined,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
      estimateMin: schedule.estimateMin,
      deadline: schedule.deadline,
      deadlineTime: schedule.deadline ? schedule.deadlineTime : undefined,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, nextTask);
    } else {
      addTask({
        ...nextTask,
        list: TAB_LIST[tab],
      });
    }
    closeComposer();
    if (app && appBehaviorId && !selectedBehavior) syncAppUsage();
    if (hasPlace) {
      requestPlaceTaskPermissions()
        .then(() => resyncReminders())
        .catch(error => console.warn('Place task permissions failed', error));
    }
  };

  const openAddComposer = () => {
    resetComposer();
    setComposerOpen(true);
    if (tab === 'shopping') applyShoppingDefaults();
  };

  /** "Add to buy" starts on Shopee (or the Settings choice) so only the item name is left to type. */
  const applyShoppingDefaults = () => {
    const { shoppingDefaultsEnabled, shoppingDefaultApp, shoppingDefaultBehaviorId } = useSettingsStore.getState();
    if (!shoppingDefaultsEnabled) return;
    const behaviorsNow = useBehaviorStore.getState().behaviors;
    const behavior = shoppingDefaultBehaviorId
      ? behaviorsNow.find(b => b.id === shoppingDefaultBehaviorId && !b.archivedAt)
      : shoppingDefaultApp
        ? undefined
        : behaviorsNow.find(b => !b.archivedAt && !b.autoTrackApp && /shopee/i.test(b.name));
    if (behavior) setSelectedBehaviorId(behavior.id);
    if (shoppingDefaultApp) {
      setSelectedApp(shoppingDefaultApp);
      return;
    }
    AppUsage?.getLaunchableApps?.()
      .then(apps => {
        const shopee = apps.find(a => /shopee/i.test(a.label) || /shopee/i.test(a.packageName));
        if (shopee) setSelectedApp(current => current ?? shopee);
      })
      .catch(() => {});
  };

  const openEditComposer = (task: TaskEntry) => {
    setTitle(task.source === 'behavior' ? '' : task.title);
    setSelectedBehaviorId(task.behaviorId);
    setSelectedPlaceId(task.placeId);
    setOneOffPlace(task.oneOffPlace);
    setSelectedApp(
      task.appPackage ? { packageName: task.appPackage, label: task.appLabel ?? task.appPackage } : undefined,
    );
    setTimed(task.timed === true);
    setIcon(task.icon ?? '');
    setSchedule({
      scheduledDate: task.scheduledDate,
      startTime: task.startTime,
      estimateMin: task.estimateMin,
      deadline: task.deadline,
      deadlineTime: task.deadlineTime,
    });
    setPlaceDwellMin(getPlaceDwellMin(task));
    setEditingTaskId(task.id);
    setComposerOpen(true);
  };

  const shiftDay = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateString(d));
  };

  const confirmRemove = (task: TaskEntry) => {
    Alert.alert('Remove Task', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeTask(task.id),
      },
    ]);
  };

  /** Ticking a task whose timer was started opens the Timer screen to log the time first; the task is marked done after. */
  const toggleTask = useCallback(
    (task: TaskEntry, date: string) => {
      const ticking = !isTaskCompleteOnDate(task, date);
      if (ticking) {
        const timer = useTimerStore.getState();
        const parkedSession = timer.parked.find(session => session.taskId === task.id);
        const onScreen = timer.taskId === task.id && (timer.startTimestamp != null || timer.pausedAt != null);
        if (onScreen || parkedSession) {
          if (!onScreen && parkedSession) timer.switchTo(parkedSession.lockedBehaviorId);
          useScreenUiStore.getState().setPendingTaskFinish({ taskId: task.id, date });
          navigation.navigate('Timer');
          return;
        }
      }
      toggleTaskCompletion(task.id, date);
    },
    [toggleTaskCompletion, navigation],
  );
  const handleTodayToggle = useCallback(
    (task: TaskEntry) => toggleTask(task, selectedDate),
    [selectedDate, toggleTask],
  );
  /** Shopping and Later items tick off today, and untick on the day they were done. */
  const handleListToggle = useCallback(
    (task: TaskEntry) => toggleTask(task, lastCompletedDate(task) ?? todayStr),
    [todayStr, toggleTask],
  );
  const openBugLog = useCallback((task: TaskEntry) => setBugTaskId(task.id), []);
  const openMenu = useCallback((task: TaskEntry) => setMenuTaskId(task.id), []);
  const toggleSelected = useCallback(
    (task: TaskEntry) =>
      setSelectedIds(ids =>
        ids ? (ids.includes(task.id) ? ids.filter(id => id !== task.id) : [...ids, task.id]) : ids,
      ),
    [],
  );
  const selectedTasks = useMemo(
    () => (tasks ?? []).filter(task => selectedIds?.includes(task.id)),
    [tasks, selectedIds],
  );

  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIds(undefined);
      return true;
    });
    return () => subscription.remove();
  }, [selecting]);

  const handleBatchApply = async (ids: string[], edits: TaskBatchEdits) => {
    setBatchOpen(false);
    setSelectedIds(undefined);
    const appBehaviorIds = new Map<string, string>();
    // An app gets (or reuses) the behavior that tracks it, with duration XP on, like in the single editor.
    if (edits.app)
      appBehaviorIds.set(edits.app.packageName, await ensureAppBehavior(edits.app, { trackDuration: true }));
    const latest = useBehaviorStore.getState().tasks ?? [];
    for (const id of ids) {
      const task = latest.find(candidate => candidate.id === id);
      if (task) updateTask(id, buildBatchUpdates(task, edits, appBehaviorIds));
    }
    if (edits.app) syncAppUsage();
    if (edits.place?.id) {
      requestPlaceTaskPermissions()
        .then(() => resyncReminders())
        .catch(error => console.warn('Place task permissions failed', error));
    }
  };

  const renderCard = (
    task: TaskEntry,
    complete: boolean,
    onToggle: (task: TaskEntry) => void,
    options: { focused?: boolean; note?: string; openAppPackage?: string; startPassed?: boolean } = {},
  ) => (
    <TaskCard
      key={task.id}
      task={task}
      behavior={behaviorOf(task)}
      place={task.placeId ? placeById.get(task.placeId) : undefined}
      complete={complete}
      todayStr={todayStr}
      timerRunning={taskTimerIds.has(task.id)}
      focused={options.focused}
      startPassed={options.startPassed}
      suggestedStart={options.startPassed ? getSuggestedStartTime(now) : undefined}
      onMoveStart={moveStart}
      note={options.note}
      openAppPackage={task.appPackage ?? options.openAppPackage}
      timeSpentMs={complete ? undefined : timeSpent.get(task.id)}
      selected={selectedIds ? selectedIds.includes(task.id) : undefined}
      onBug={selecting ? undefined : openBugLog}
      onToggle={selecting ? toggleSelected : onToggle}
      onLongPress={selecting ? toggleSelected : openMenu}
    />
  );

  const sortAction = sort === 'heat' ? 'Hottest first' : 'Oldest first';
  const toggleSort = () => setSort(sort === 'heat' ? 'oldest' : 'heat');

  const renderFixFirst = () => (
    <>
      <SectionHeader title="🔥 Fix first" />
      {fixFirstTasks.map(task =>
        task.list === 'shopping' || listOf(task) === 'shopping'
          ? renderCard(task, false, handleListToggle, { openAppPackage: shoppingTimerApp?.packageName })
          : renderCard(task, false, handleTodayToggle),
      )}
    </>
  );

  const moveStart = useCallback(
    (task: TaskEntry, startTime: string) => updateTask(task.id, { startTime, scheduledDate: todayStr }),
    [updateTask, todayStr],
  );

  const renderTimeline = () => {
    const { done, open } = timelineTasks;
    const showNow = isToday;
    type OpenItem = { key: string; ts?: number; task?: TaskEntry; needId?: NeedId; running?: boolean };
    const startOf = (task: TaskEntry) => {
      if (!task.startTime) return undefined;
      const [h, m] = task.startTime.split(':').map(Number);
      const date = new Date(`${task.scheduledDate}T00:00:00`);
      date.setHours(h, m, 0, 0);
      return date.getTime();
    };
    const running = open.filter(task => taskTimerIds.has(task.id));
    const items: OpenItem[] = [
      ...open.filter(task => !taskTimerIds.has(task.id)).map(task => ({ key: task.id, ts: startOf(task), task })),
      ...needForecasts.map(forecast => ({ key: `need:${forecast.needId}`, ts: forecast.ts, needId: forecast.needId })),
    ];
    // Timed items (tasks with a start time, need forecasts) by time; tasks without a start time keep their order after.
    const timed = items.filter(item => item.ts != null).sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    const untimed = items.filter(item => item.ts == null);
    const ordered: OpenItem[] = [...running.map(task => ({ key: task.id, task, running: true })), ...timed, ...untimed];
    const total = done.length + ordered.length + (showNow ? 1 : 0);
    if (total === 0) return <Text style={styles.empty}>Nothing for this day.</Text>;
    let index = 0;
    const rowFlags = () => ({ first: index === 0, last: index === total - 1 });
    const rows: React.ReactNode[] = [];
    for (const task of done) {
      rows.push(
        <TaskTimelineRow
          key={task.id}
          filled
          dotColor={Colors.status.success}
          {...rowFlags()}
        >
          {renderCard(task, true, handleTodayToggle, { focused: isTaskFocusedOn(task, selectedDate) })}
        </TaskTimelineRow>,
      );
      index += 1;
    }
    if (showNow) {
      rows.push(
        <TaskTimelineNow
          key="now"
          now={now}
        />,
      );
      index += 1;
    }
    for (const item of ordered) {
      if (item.needId != null && item.ts != null) {
        rows.push(
          <TaskTimelineRow
            key={item.key}
            dotColor="#F9A825"
            {...rowFlags()}
          >
            <TaskNeedLowNode
              needId={item.needId}
              ts={item.ts}
            />
          </TaskTimelineRow>,
        );
      } else if (item.task) {
        const task = item.task;
        const passed = !item.running && isToday && isStartPassed(task, now, todayStr);
        rows.push(
          <TaskTimelineRow
            key={item.key}
            dotColor={item.running ? '#4a9eff' : passed ? Colors.cooldown.red : undefined}
            filled={item.running}
            {...rowFlags()}
          >
            {renderCard(task, false, handleTodayToggle, {
              focused: isTaskFocusedOn(task, selectedDate),
              startPassed: passed,
            })}
          </TaskTimelineRow>,
        );
      }
      index += 1;
    }
    return <View style={styles.timeline}>{rows}</View>;
  };

  const renderToday = () => (
    <>
      {bugNudgeTask && focusTasks.length < TODAY_FOCUS_LIMIT && (
        <BugNudgeCard
          task={bugNudgeTask}
          onAdd={() => toggleTaskFocus(bugNudgeTask.id, todayStr)}
          onDismiss={() => dismissTaskBugNudge(bugNudgeTask.id)}
        />
      )}
      {fixFirstTasks.length > 0 && renderFixFirst()}
      <SectionHeader
        title="Timeline"
        action={
          canPick
            ? focusTasks.length > 0
              ? `Today's ${TODAY_FOCUS_LIMIT}: change`
              : `Pick today's ${TODAY_FOCUS_LIMIT}`
            : undefined
        }
        onAction={() => setPickOpen(true)}
      />
      {renderTimeline()}
    </>
  );

  const renderShopping = () => (
    <>
      <SectionHeader
        title="To buy"
        action={toBuyTasks.length > 1 ? sortAction : undefined}
        onAction={toggleSort}
      />
      {toBuyTasks.length === 0 ? (
        <Text style={styles.empty}>Nothing to buy. Tap + to add something.</Text>
      ) : (
        toBuyTasks.map(task =>
          renderCard(task, false, handleListToggle, { openAppPackage: shoppingTimerApp?.packageName }),
        )
      )}
      {gotItTasks.length > 0 && <SectionHeader title="Got it" />}
      {gotItTasks.map(task => {
        const date = lastCompletedDate(task);
        return renderCard(task, true, handleListToggle, {
          note: date ? `Got it ${formatDateDisplay(date)}` : undefined,
        });
      })}
    </>
  );

  const renderLater = () => (
    <>
      <SectionHeader
        title="Someday"
        action={laterTasks.length > 1 ? sortAction : undefined}
        onAction={toggleSort}
      />
      <Text style={styles.hint}>Ideas for later. They never show up as due. Long-press one to move it to Today.</Text>
      {laterTasks.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet.</Text>
      ) : (
        laterTasks.map(task => renderCard(task, false, handleListToggle))
      )}
    </>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <TabHeader title="Tasks" />

      <View style={styles.tabs}>
        <TaskTabs
          active={tab}
          counts={tabCounts}
          onChange={setTab}
        />
      </View>

      {tab === 'today' && (
        <>
          <DateNavigationRow
            selectedDate={selectedDate}
            dayMetrics={calendarDayMetrics}
            dayMetricType="tasks"
            onSelect={setSelectedDate}
            onPrevious={() => shiftDay(-1)}
            onNext={() => shiftDay(1)}
          />
          <View style={styles.strip}>
            <FocusStreakStrip
              streak={streak}
              pickedCount={focusTasks.length}
              doneCount={focusDoneCount}
              bonusEarned={bonusEarned}
            />
          </View>
        </>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, selecting && styles.listContentSelecting]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {tab === 'today' && renderToday()}
        {tab === 'shopping' && renderShopping()}
        {tab === 'later' && renderLater()}
      </ScrollView>

      {!composerOpen && !selecting && (
        <View
          style={styles.fab}
          pointerEvents="box-none"
        >
          <AddBehaviorFab
            label={FAB_LABELS[tab]}
            collapsed={fabCollapsed}
            onPress={openAddComposer}
          />
        </View>
      )}

      {composerOpen && (
        <TaskEditorDialog
          editing={editingTaskId != null}
          timeSpentMs={editingTaskId ? timeSpent.get(editingTaskId) : undefined}
          title={title}
          onTitleChange={setTitle}
          behaviors={availableBehaviors}
          selectedBehavior={selectedBehavior}
          onBehaviorSelect={setSelectedBehaviorId}
          app={selectedApp}
          onAppChange={setSelectedApp}
          places={places}
          selectedPlace={selectedPlaceId ? placeById.get(selectedPlaceId) : undefined}
          onPlaceSelect={placeId => {
            setSelectedPlaceId(placeId);
            setOneOffPlace(undefined);
          }}
          oneOffPlace={oneOffPlace}
          onOneOffPlaceChange={place => {
            setOneOffPlace(place);
            if (place) setSelectedPlaceId(undefined);
          }}
          placeDwellMin={placeDwellMin}
          onPlaceDwellChange={setPlaceDwellMin}
          timed={timed}
          onTimedChange={setTimed}
          icon={icon}
          onIconChange={setIcon}
          schedule={schedule}
          onScheduleChange={setSchedule}
          onSubmit={handleSubmitTask}
          onCancel={closeComposer}
        />
      )}

      {selecting && (
        <TaskSelectionBar
          count={selectedTasks.length}
          onCancel={() => setSelectedIds(undefined)}
          onEdit={() => setBatchOpen(true)}
          onMove={list => {
            for (const task of selectedTasks) updateTask(task.id, { list });
            setSelectedIds(undefined);
          }}
        />
      )}

      {batchOpen && selectedTasks.length > 0 && (
        <TaskBatchEditDialog
          tasks={selectedTasks}
          behaviors={availableBehaviors}
          places={places}
          onApply={handleBatchApply}
          onCancel={() => setBatchOpen(false)}
        />
      )}

      {menuTask && (
        <TaskActionSheet
          task={menuTask}
          list={listOf(menuTask)}
          focused={isTaskFocusedOn(menuTask, focusDate)}
          canFocus={focusCountForPickDate < TODAY_FOCUS_LIMIT}
          onClose={() => setMenuTaskId(undefined)}
          onEdit={() => {
            setMenuTaskId(undefined);
            openEditComposer(menuTask);
          }}
          onSelect={() => {
            setMenuTaskId(undefined);
            setSelectedIds([menuTask.id]);
          }}
          onToggleFocus={() => {
            setMenuTaskId(undefined);
            toggleTaskFocus(menuTask.id, focusDate);
          }}
          onBug={() => {
            setMenuTaskId(undefined);
            setBugTaskId(menuTask.id);
          }}
          onBugHistory={() => {
            setMenuTaskId(undefined);
            setHistoryTaskId(menuTask.id);
          }}
          onMove={list => {
            setMenuTaskId(undefined);
            updateTask(menuTask.id, { list });
          }}
          onDelete={() => {
            setMenuTaskId(undefined);
            confirmRemove(menuTask);
          }}
        />
      )}

      {bugTask && (
        <BugLogSheet
          task={bugTask}
          onClose={() => setBugTaskId(undefined)}
          onSave={(bug: TaskBug) => {
            addTaskBug(bugTask.id, bug);
            setBugTaskId(undefined);
          }}
        />
      )}

      {historyTask && !bugTask && (
        <BugHistorySheet
          task={historyTask}
          onClose={() => setHistoryTaskId(undefined)}
          onLogBug={() => setBugTaskId(historyTask.id)}
          onRemoveBug={at => removeTaskBug(historyTask.id, at)}
        />
      )}

      {pickOpen && (
        <TodayPickSheet
          candidates={pickCandidates}
          onToggle={task => toggleTaskFocus(task.id, focusDate)}
          onClose={() => setPickOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={styles.sectionTitle}
        numberOfLines={1}
      >
        {title}
      </Text>
      {action && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Text
            style={styles.sectionAction}
            numberOfLines={1}
          >
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  strip: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContentSelecting: { paddingBottom: 140 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 6,
  },
  timeline: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  sectionAction: {
    color: '#9cc2ff',
    fontSize: 13,
    fontWeight: '700',
  },
  pickCard: {
    backgroundColor: '#1f2430',
    borderWidth: 1,
    borderColor: '#2f3b55',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  pickText: {
    color: Colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: Colors.text.muted,
    fontSize: 13,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
});
