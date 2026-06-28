import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BottomNav } from '../../components/BottomNav';
import { Button } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { TaskEntry, TaskStarValue } from '../../types/task';
import { Colors } from '../../utils/colors';
import { describeDay, toDateString } from '../../utils/dateUtils';
import { getTaskStarsForDate, getTasksForDate, isTaskCompleteOnDate } from '../../utils/taskUtils';
import { TaskCard } from './components/task-card';
import { TaskComposer } from './components/task-composer';

export function TaskScreen() {
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [title, setTitle] = useState('');
  const [behaviorQuery, setBehaviorQuery] = useState('');
  const [stars, setStars] = useState<TaskStarValue>(1);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [composerOpen, setComposerOpen] = useState(false);

  const behaviors = useBehaviorStore(s => s.behaviors);
  const tasks = useBehaviorStore(s => s.tasks);
  const addTask = useBehaviorStore(s => s.addTask);
  const removeTask = useBehaviorStore(s => s.removeTask);
  const toggleTaskCompletion = useBehaviorStore(s => s.toggleTaskCompletion);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);

  const availableBehaviors = useMemo(() => {
    const visible = hidePrivate ? behaviors.filter(behavior => !behavior.private) : behaviors;
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, hidePrivate]);

  const selectedBehavior = availableBehaviors.find(behavior => behavior.id === selectedBehaviorId);
  const dayTasks = useMemo(() => getTasksForDate(tasks, selectedDate), [tasks, selectedDate]);
  const completedCount = dayTasks.filter(task => isTaskCompleteOnDate(task, selectedDate)).length;
  const taskStars = useMemo(() => getTaskStarsForDate(tasks, selectedDate), [tasks, selectedDate]);
  const dayLabel = describeDay(selectedDate);

  const handleAddTask = () => {
    const trimmedTitle = title.trim();
    const taskTitle = trimmedTitle || selectedBehavior?.name.trim() || '';
    if (!taskTitle) return;
    const isBehaviorOnlyTask = !trimmedTitle && selectedBehavior != null;

    addTask({
      title: taskTitle,
      scheduledDate: selectedDate,
      stars: selectedBehavior ? 0 : stars,
      source: isBehaviorOnlyTask ? 'behavior' : 'oneOff',
      behaviorId: selectedBehavior?.id,
    });
    setTitle('');
    setBehaviorQuery('');
    setSelectedBehaviorId(undefined);
    setComposerOpen(false);
  };

  const resetComposer = () => {
    setTitle('');
    setBehaviorQuery('');
    setSelectedBehaviorId(undefined);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenTitle>Tasks</ScreenTitle>
      </View>

      <View style={styles.dateRow}>
        <Pressable
          onPress={goToPrevDay}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={Colors.text.primary}
          />
        </Pressable>

        <View style={styles.dateLabelWrap}>
          <DatePicker
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </View>

        <Pressable
          onPress={goToNextDay}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.text.primary}
          />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>done</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{dayTasks.length}</Text>
          <Text style={styles.summaryLabel}>tasks</Text>
        </View>
        <View
          style={styles.summaryItem}
          accessible
          accessibilityLabel={`${taskStars} task stars on this date`}
        >
          <View style={styles.starSummaryValue}>
            <Ionicons
              name="star"
              size={18}
              color={Colors.star.filled}
            />
            <Text style={styles.summaryValue}>{taskStars}</Text>
          </View>
          <Text style={styles.summaryLabel}>stars</Text>
        </View>
        {dayLabel !== '' && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{dayLabel}</Text>
            <Text style={styles.summaryLabel}>when</Text>
          </View>
        )}
      </View>

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
            onAdd={handleAddTask}
            onCancel={() => {
              resetComposer();
              setComposerOpen(false);
            }}
          />
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>SCHEDULED</Text>
        </View>

        <FlatList
          data={dayTasks}
          keyExtractor={task => task.id}
          style={styles.scheduledList}
          contentContainerStyle={[styles.scheduledContent, dayTasks.length === 0 && styles.scheduledEmptyContent]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          ItemSeparatorComponent={TaskSeparator}
          ListEmptyComponent={<Text style={styles.empty}>No tasks for this date.</Text>}
          renderItem={({ item: task }) => {
            const behavior = task.behaviorId ? behaviors.find(item => item.id === task.behaviorId) : undefined;
            return (
              <TaskCard
                task={task}
                behavior={behavior}
                selectedDate={selectedDate}
                onToggle={() => toggleTaskCompletion(task.id, selectedDate)}
                onRemove={() => confirmRemove(task)}
              />
            );
          }}
        />
      </View>

      {!composerOpen && (
        <View style={styles.bottomAction}>
          <Button
            variant="primary"
            onPress={() => setComposerOpen(true)}
            style={styles.openComposerButton}
          >
            + Add task
          </Button>
        </View>
      )}

      <BottomNav />
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  arrowBtn: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 12,
  },
  dateLabelWrap: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.bg.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 54,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  starSummaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
