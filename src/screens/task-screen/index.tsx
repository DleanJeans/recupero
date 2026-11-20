import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { LaunchableApp } from '../../../modules/app-usage';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { TabHeader } from '../../components/tab-header';
import { Text } from '../../components/text';
import { useDeferredComputation } from '../../hooks/use-deferred-computation';
import { useFabCollapse } from '../../hooks/use-fab-collapse';
import { resyncReminders } from '../../hooks/use-reminder-engine';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCuesStore } from '../../store/cues-store';
import { type TaskTab, useScreenUiStore } from '../../store/screen-ui-store';
import { useSettingsStore } from '../../store/settings-store';
import { useTimerStore } from '../../store/timer-store';
import type { TaskEntry, TaskList, TaskStarValue } from '../../types/task';
import { ensureAppBehavior } from '../../utils/app-behavior';
import { syncAppUsage } from '../../utils/app-usage-sync';
import { getActiveBehaviors } from '../../utils/archive-utils';
import { getCalendarTaskCompletionMetrics } from '../../utils/calendar-metrics';
import { Colors } from '../../utils/colors';
import { formatDateDisplay, toDateString } from '../../utils/date-utils';
import { DEFAULT_PLACE_DWELL_MIN, getPlaceDwellMin } from '../../utils/place-task-utils';
import { requestPlaceTaskPermissions } from '../../utils/reminder-permissions';
import {
  FOCUS_BONUS_STARS,
  getFocusStreak,
  getFocusTasksForDate,
  getTaskList,
  getTaskStarsForDate,
  getTasksForDate,
  hasFocusBonusOnDate,
  isTaskCompleteOnDate,
  isTaskFocusedOn,
  isTaskVisibleOnDate,
  TODAY_FOCUS_LIMIT,
} from '../../utils/task-utils';
import { DateNavigationRow } from '../components/date-navigation-row';
import { AddBehaviorFab } from '../home-screen/components/add-behavior-fab';
import { FocusStreakStrip } from './components/focus-streak-strip';
import { TaskActionSheet } from './components/task-action-sheet';
import { TaskCard } from './components/task-card';
import { TaskEditorDialog } from './components/task-editor-dialog';
import { TaskTabs } from './components/task-tabs';
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
  const setTab = useScreenUiStore(s => s.setTaskScreenTab);
  const selectedDate = taskScreenSelectedDate ?? todayStr;
  const [title, setTitle] = useState('');
  const [stars, setStars] = useState<TaskStarValue>(1);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [placeDwellMin, setPlaceDwellMin] = useState(DEFAULT_PLACE_DWELL_MIN);
  const [selectedApp, setSelectedApp] = useState<LaunchableApp>();
  const [timed, setTimed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [menuTaskId, setMenuTaskId] = useState<string | undefined>();
  const [pickOpen, setPickOpen] = useState(false);
  const { collapsed: fabCollapsed, onScroll } = useFabCollapse();

  const behaviors = useBehaviorStore(s => s.behaviors);
  const tasks = useBehaviorStore(s => s.tasks);
  const addTask = useBehaviorStore(s => s.addTask);
  const updateTask = useBehaviorStore(s => s.updateTask);
  const removeTask = useBehaviorStore(s => s.removeTask);
  const toggleTaskCompletion = useBehaviorStore(s => s.toggleTaskCompletion);
  const toggleTaskFocus = useBehaviorStore(s => s.toggleTaskFocus);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const shoppingTimerApp = useSettingsStore(s => s.shoppingTimerApp);
  const places = useCuesStore(s => s.places);
  const placeById = useMemo(() => new Map(places.map(place => [place.id, place])), [places]);

  const availableBehaviors = useMemo(() => {
    if (!composerOpen) return [];
    const active = getActiveBehaviors(behaviors);
    const visible = hidePrivate ? active.filter(behavior => !behavior.private) : active;
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, composerOpen, hidePrivate]);
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
  const nextUpTasks = useMemo(
    () =>
      getTasksForDate(tasks, selectedDate, dayCutoffHour).filter(
        task => !isTaskFocusedOn(task, selectedDate) && listOf(task) === 'next',
      ),
    [tasks, selectedDate, dayCutoffHour, listOf],
  );
  const shoppingTasks = useMemo(
    () => (tasks ?? []).filter(task => !task.archived && listOf(task) === 'shopping'),
    [tasks, listOf],
  );
  const toBuyTasks = useMemo(
    () => shoppingTasks.filter(task => task.completedDates.length === 0).sort((a, b) => a.createdAt - b.createdAt),
    [shoppingTasks],
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
      (tasks ?? [])
        .filter(task => !task.archived && task.completedDates.length === 0 && listOf(task) === 'someday')
        .sort((a, b) => a.createdAt - b.createdAt),
    [tasks, listOf],
  );

  const focusDoneCount = focusTasks.filter(task => isTaskCompleteOnDate(task, selectedDate)).length;
  const bonusEarned = useMemo(() => hasFocusBonusOnDate(tasks, selectedDate), [tasks, selectedDate]);
  const streak = useMemo(() => getFocusStreak(tasks, todayStr), [tasks, todayStr]);
  const starsOnDate = useMemo(() => getTaskStarsForDate(tasks, selectedDate), [tasks, selectedDate]);
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
  const menuTask = menuTaskId ? (tasks ?? []).find(task => task.id === menuTaskId) : undefined;

  const resetComposer = () => {
    setTitle('');
    setSelectedBehaviorId(undefined);
    setSelectedApp(undefined);
    setTimed(false);
    setSelectedPlaceId(undefined);
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
    const appBehaviorId = app ? await ensureAppBehavior(app, { trackDuration: isTimed }) : undefined;
    const behaviorId = selectedBehavior?.id ?? appBehaviorId;
    const isBehaviorOnlyTask = !trimmedTitle && behaviorId != null;
    const hasPlace = selectedPlaceId != null && placeById.has(selectedPlaceId);
    const nextTask = {
      title: taskTitle,
      stars: stars === 0 ? (1 as const) : stars,
      source: isBehaviorOnlyTask ? ('behavior' as const) : ('oneOff' as const),
      behaviorId,
      placeId: hasPlace ? selectedPlaceId : undefined,
      placeDwellMin: hasPlace ? placeDwellMin : undefined,
      appPackage: app?.packageName,
      appLabel: app?.label,
      timed: isTimed ? (true as const) : undefined,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, nextTask);
    } else {
      addTask({
        ...nextTask,
        scheduledDate: tab === 'today' ? selectedDate : todayStr,
        list: TAB_LIST[tab],
      });
    }
    closeComposer();
    if (app && appBehaviorId && !selectedBehavior) syncAppUsage();
    if (nextTask.placeId) {
      requestPlaceTaskPermissions()
        .then(() => resyncReminders())
        .catch(error => console.warn('Place task permissions failed', error));
    }
  };

  const openAddComposer = () => {
    resetComposer();
    setStars(1);
    setComposerOpen(true);
  };

  const openEditComposer = (task: TaskEntry) => {
    const behavior = behaviorOf(task);
    setTitle(task.source === 'behavior' ? '' : task.title);
    setStars(task.stars === 0 ? 1 : task.stars);
    // A behavior that only came from the task's app shows on the App row, not again on the Behavior row.
    const behaviorIsApp = task.appPackage != null && behavior?.autoTrackApp?.packageName === task.appPackage;
    setSelectedBehaviorId(behaviorIsApp ? undefined : task.behaviorId);
    setSelectedPlaceId(task.placeId);
    setSelectedApp(
      task.appPackage ? { packageName: task.appPackage, label: task.appLabel ?? task.appPackage } : undefined,
    );
    setTimed(task.timed === true);
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

  /** Ticking a timed task while its timer runs stops the timer and logs the time it ran. */
  const toggleTask = useCallback(
    (task: TaskEntry, date: string) => {
      const ticking = !isTaskCompleteOnDate(task, date);
      const range =
        ticking && task.timed && task.behaviorId
          ? useTimerStore.getState().takeRunning(task.behaviorId, Date.now())
          : undefined;
      toggleTaskCompletion(task.id, date, range);
    },
    [toggleTaskCompletion],
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
  const openMenu = useCallback((task: TaskEntry) => setMenuTaskId(task.id), []);

  const renderCard = (
    task: TaskEntry,
    complete: boolean,
    onToggle: (task: TaskEntry) => void,
    options: { focused?: boolean; note?: string; openAppPackage?: string } = {},
  ) => (
    <TaskCard
      key={task.id}
      task={task}
      behavior={behaviorOf(task)}
      place={task.placeId ? placeById.get(task.placeId) : undefined}
      complete={complete}
      focused={options.focused}
      note={options.note}
      openAppPackage={task.appPackage ?? options.openAppPackage}
      onToggle={onToggle}
      onLongPress={openMenu}
    />
  );

  const renderToday = () => (
    <>
      <SectionHeader
        title={`Today's ${TODAY_FOCUS_LIMIT}`}
        action={canPick ? (focusTasks.length > 0 ? 'Change' : 'Pick') : undefined}
        onAction={() => setPickOpen(true)}
      />
      {focusTasks.length === 0 ? (
        <View style={styles.pickCard}>
          <Text style={styles.pickText}>
            {canPick
              ? `Pick up to ${TODAY_FOCUS_LIMIT} tasks to focus on. Finish all ${TODAY_FOCUS_LIMIT} for +${FOCUS_BONUS_STARS} stars and a day on your streak.`
              : 'No tasks were picked on this day.'}
          </Text>
          {canPick && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => setPickOpen(true)}
            >
              {`Pick today's ${TODAY_FOCUS_LIMIT}`}
            </Button>
          )}
        </View>
      ) : (
        focusTasks.map(task =>
          renderCard(task, isTaskCompleteOnDate(task, selectedDate), handleTodayToggle, { focused: true }),
        )
      )}
      <SectionHeader title="Next up" />
      {nextUpTasks.length === 0 ? (
        <Text style={styles.empty}>Nothing else for this day.</Text>
      ) : (
        nextUpTasks.map(task => renderCard(task, isTaskCompleteOnDate(task, selectedDate), handleTodayToggle))
      )}
    </>
  );

  const renderShopping = () => (
    <>
      <SectionHeader title="To buy" />
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
      <SectionHeader title="Someday" />
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
              starsToday={starsOnDate}
            />
          </View>
        </>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {tab === 'today' && renderToday()}
        {tab === 'shopping' && renderShopping()}
        {tab === 'later' && renderLater()}
      </ScrollView>

      {!composerOpen && (
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
          title={title}
          onTitleChange={setTitle}
          stars={stars}
          onStarsChange={setStars}
          behaviors={availableBehaviors}
          selectedBehavior={selectedBehavior}
          onBehaviorSelect={setSelectedBehaviorId}
          app={selectedApp}
          onAppChange={setSelectedApp}
          places={places}
          selectedPlace={selectedPlaceId ? placeById.get(selectedPlaceId) : undefined}
          onPlaceSelect={setSelectedPlaceId}
          placeDwellMin={placeDwellMin}
          onPlaceDwellChange={setPlaceDwellMin}
          timed={timed}
          onTimedChange={setTimed}
          onSubmit={handleSubmitTask}
          onCancel={closeComposer}
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
          onToggleFocus={() => {
            setMenuTaskId(undefined);
            toggleTaskFocus(menuTask.id, focusDate);
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
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
