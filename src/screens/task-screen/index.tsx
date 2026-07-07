import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useDeferredComputation } from '../../hooks/use-deferred-computation';
import { useBehaviorStore } from '../../store/behavior-store';
import { useScreenUiStore } from '../../store/screen-ui-store';
import { useSettingsStore } from '../../store/settings-store';
import type { TaskEntry, TaskStarValue } from '../../types/task';
import { getCalendarTaskCompletionMetrics } from '../../utils/calendar-metrics';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import { getTaskStarsForDate, getTasksForDate, isTaskCompleteOnDate } from '../../utils/task-utils';
import { DateNavigationRow } from '../components/date-navigation-row';
import { SummaryRow } from '../components/summary-row';
import { TaskCard } from './components/task-card';
import { TaskComposer } from './components/task-composer';

const TASK_LIST_LAYOUT = LinearTransition.duration(240);

export function TaskScreen() {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const todayStr = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour]);
  const taskScreenSelectedDate = useScreenUiStore(s => s.taskScreenSelectedDate);
  const setTaskScreenSelectedDate = useScreenUiStore(s => s.setTaskScreenSelectedDate);
  const selectedDate = taskScreenSelectedDate ?? todayStr;
  const setSelectedDate = useCallback(
    (date: string) => {
      setTaskScreenSelectedDate(date);
    },
    [setTaskScreenSelectedDate],
  );
  const [title, setTitle] = useState('');
  const [behaviorQuery, setBehaviorQuery] = useState('');
  const [stars, setStars] = useState<TaskStarValue>(1);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();

  const behaviors = useBehaviorStore(s => s.behaviors);
  const tasks = useBehaviorStore(s => s.tasks);
  const addTask = useBehaviorStore(s => s.addTask);
  const updateTask = useBehaviorStore(s => s.updateTask);
  const removeTask = useBehaviorStore(s => s.removeTask);
  const toggleTaskCompletion = useBehaviorStore(s => s.toggleTaskCompletion);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);

  const availableBehaviors = useMemo(() => {
    if (!composerOpen) return [];
    const visible = hidePrivate ? behaviors.filter(behavior => !behavior.private) : behaviors;
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, composerOpen, hidePrivate]);
  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);

  const selectedBehavior = selectedBehaviorId ? behaviorById.get(selectedBehaviorId) : undefined;
  const dayTasks = useMemo(
    () => getTasksForDate(tasks, selectedDate, dayCutoffHour),
    [tasks, dayCutoffHour, selectedDate],
  );
  const completedCount = useMemo(
    () => dayTasks.filter(task => isTaskCompleteOnDate(task, selectedDate)).length,
    [dayTasks, selectedDate],
  );
  const taskStars = useMemo(() => getTaskStarsForDate(tasks, selectedDate), [tasks, selectedDate]);
  const calendarDayMetrics = useDeferredComputation(() => getCalendarTaskCompletionMetrics(tasks), [tasks]);
  const summaryItems = useMemo(
    () => [
      { label: 'done', value: completedCount },
      { label: 'tasks', value: dayTasks.length },
      {
        label: 'stars',
        value: taskStars,
        icon: 'star' as const,
        accessibilityLabel: `${taskStars} task stars on this date`,
      },
    ],
    [completedCount, dayTasks.length, taskStars],
  );

  const resetComposer = () => {
    setTitle('');
    setBehaviorQuery('');
    setSelectedBehaviorId(undefined);
    setEditingTaskId(undefined);
  };

  const closeComposer = () => {
    resetComposer();
    setComposerOpen(false);
  };

  const handleSubmitTask = () => {
    const trimmedTitle = title.trim();
    const taskTitle = trimmedTitle || selectedBehavior?.name.trim() || '';
    if (!taskTitle) return;
    const isBehaviorOnlyTask = !trimmedTitle && selectedBehavior != null;
    const nextStars: TaskStarValue = selectedBehavior ? 0 : stars === 0 ? 1 : stars;
    const nextTask = {
      title: taskTitle,
      scheduledDate: selectedDate,
      stars: nextStars,
      source: isBehaviorOnlyTask ? ('behavior' as const) : ('oneOff' as const),
      behaviorId: selectedBehavior?.id,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, nextTask);
    } else {
      addTask(nextTask);
    }
    closeComposer();
  };

  const openAddComposer = () => {
    resetComposer();
    setStars(1);
    setComposerOpen(true);
  };

  const openEditComposer = useCallback(
    (task: TaskEntry) => {
      const behavior = task.behaviorId ? behaviorById.get(task.behaviorId) : undefined;
      setTitle(task.source === 'behavior' ? '' : task.title);
      setBehaviorQuery(behavior?.name ?? '');
      setStars(task.stars);
      setSelectedBehaviorId(task.behaviorId);
      setEditingTaskId(task.id);
      setComposerOpen(true);
    },
    [behaviorById],
  );

  const goToPrevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateString(d));
  };

  const goToNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateString(d));
  };

  const confirmRemove = useCallback(
    (task: TaskEntry) => {
      Alert.alert('Remove Task', `Remove "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeTask(task.id),
        },
      ]);
    },
    [removeTask],
  );
  const handleToggleTask = useCallback(
    (taskId: string) => {
      toggleTaskCompletion(taskId, selectedDate);
    },
    [selectedDate, toggleTaskCompletion],
  );
  const renderTask = useCallback(
    ({ item: task }: { item: TaskEntry }) => {
      const behavior = task.behaviorId ? behaviorById.get(task.behaviorId) : undefined;
      return (
        <TaskCard
          task={task}
          behavior={behavior}
          selectedDate={selectedDate}
          onToggle={() => handleToggleTask(task.id)}
          onEdit={() => openEditComposer(task)}
          onRemove={() => confirmRemove(task)}
        />
      );
    },
    [behaviorById, confirmRemove, handleToggleTask, openEditComposer, selectedDate],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <ScreenTitle>Tasks</ScreenTitle>
      </View>

      <DateNavigationRow
        selectedDate={selectedDate}
        dayMetrics={calendarDayMetrics}
        dayMetricType="tasks"
        onSelect={setSelectedDate}
        onPrevious={goToPrevDay}
        onNext={goToNextDay}
      />

      <SummaryRow items={summaryItems} />

      <View style={styles.content}>
        {composerOpen && (
          <TaskComposer
            title={title}
            behaviorQuery={behaviorQuery}
            stars={stars}
            behaviors={availableBehaviors}
            selectedBehaviorId={selectedBehaviorId}
            onTitleChange={setTitle}
            onBehaviorQueryChange={setBehaviorQuery}
            onStarsChange={setStars}
            onBehaviorSelect={setSelectedBehaviorId}
            onAdd={handleSubmitTask}
            onCancel={closeComposer}
            submitLabel={editingTaskId ? 'Save' : 'Add'}
          />
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>SCHEDULED</Text>
        </View>

        <Animated.FlatList
          data={dayTasks}
          keyExtractor={task => task.id}
          style={styles.scheduledList}
          contentContainerStyle={[styles.scheduledContent, dayTasks.length === 0 && styles.scheduledEmptyContent]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          ItemSeparatorComponent={TaskSeparator}
          itemLayoutAnimation={TASK_LIST_LAYOUT}
          ListEmptyComponent={<Text style={styles.empty}>No tasks for this date.</Text>}
          renderItem={renderTask}
        />
      </View>

      {!composerOpen && (
        <View style={styles.bottomAction}>
          <Button
            variant="primary"
            onPress={openAddComposer}
            style={styles.openComposerButton}
          >
            + Add task
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

function TaskSeparator() {
  return <View style={styles.taskSeparator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  bottomAction: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  openComposerButton: {
    alignSelf: 'stretch',
  },
  listHeader: {
    paddingTop: 4,
  },
  scheduledList: {
    flex: 1,
  },
  scheduledContent: {
    paddingBottom: 14,
  },
  scheduledEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  taskSeparator: {
    height: 6,
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 24,
  },
});
