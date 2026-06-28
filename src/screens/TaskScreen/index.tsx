import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../components/BehaviorIcon';
import { BottomNav } from '../../components/BottomNav';
import { Button } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text, TextInput } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { TaskEntry, TaskStarValue } from '../../types/task';
import { Colors } from '../../utils/colors';
import { describeDay, toDateString } from '../../utils/dateUtils';
import { getTaskStarsForDate, getTasksForDate, isTaskCompleteOnDate } from '../../utils/taskUtils';

type TaskMode = 'oneOff' | 'behavior';

export function TaskScreen() {
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [mode, setMode] = useState<TaskMode>('oneOff');
  const [title, setTitle] = useState('');
  const [stars, setStars] = useState<TaskStarValue>(1);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();

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
    const behaviorTitle = selectedBehavior?.name.trim() ?? '';
    const trimmed = mode === 'behavior' ? behaviorTitle : title.trim();
    if (!trimmed) return;
    if (mode === 'behavior' && !selectedBehavior) return;

    addTask({
      title: trimmed,
      scheduledDate: selectedDate,
      stars: mode === 'oneOff' ? stars : 0,
      behaviorId: mode === 'behavior' ? selectedBehavior?.id : undefined,
    });
    setTitle('');
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
        <TaskComposer
          mode={mode}
          title={title}
          stars={stars}
          behaviors={availableBehaviors}
          selectedBehaviorId={selectedBehaviorId}
          onModeChange={setMode}
          onTitleChange={setTitle}
          onStarsChange={setStars}
          onBehaviorSelect={setSelectedBehaviorId}
          onAdd={handleAddTask}
        />

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

      <BottomNav />
    </SafeAreaView>
  );
}

interface TaskComposerProps {
  mode: TaskMode;
  title: string;
  stars: TaskStarValue;
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  onModeChange: (mode: TaskMode) => void;
  onTitleChange: (title: string) => void;
  onStarsChange: (stars: TaskStarValue) => void;
  onBehaviorSelect: (behaviorId: string | undefined) => void;
  onAdd: () => void;
}

function TaskComposer({
  mode,
  title,
  stars,
  behaviors,
  selectedBehaviorId,
  onModeChange,
  onTitleChange,
  onStarsChange,
  onBehaviorSelect,
  onAdd,
}: TaskComposerProps) {
  const canAdd = mode === 'behavior' ? !!selectedBehaviorId : title.trim().length > 0;
  const handleModeChange = (nextMode: TaskMode) => {
    if (nextMode === 'behavior') onBehaviorSelect(undefined);
    onModeChange(nextMode);
  };

  return (
    <View style={styles.composer}>
      <View style={styles.modeRow}>
        <ModeButton
          label="One-off"
          icon="create-outline"
          active={mode === 'oneOff'}
          onPress={() => handleModeChange('oneOff')}
        />
        <ModeButton
          label="Behavior"
          icon="repeat-outline"
          active={mode === 'behavior'}
          onPress={() => handleModeChange('behavior')}
        />
      </View>

      {mode === 'oneOff' ? (
        <TextInput
          style={styles.titleInput}
          placeholder="Task name"
          placeholderTextColor={Colors.text.faint}
          value={title}
          onChangeText={onTitleChange}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
      ) : (
        <BehaviorSelector
          behaviors={behaviors}
          selectedBehaviorId={selectedBehaviorId}
          onSelect={onBehaviorSelect}
        />
      )}

      <View style={styles.composerFooter}>
        {mode === 'oneOff' && (
          <StarPicker
            value={stars}
            onChange={onStarsChange}
          />
        )}
        <Button
          variant="primary"
          size="sm"
          onPress={onAdd}
          disabled={!canAdd}
          style={mode === 'behavior' && styles.behaviorAddButton}
        >
          Add
        </Button>
      </View>
    </View>
  );
}

interface ModeButtonProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  onPress: () => void;
}

function ModeButton({ label, icon, active, onPress }: ModeButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? Colors.text.primary : Colors.text.faint}
      />
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

interface BehaviorSelectorProps {
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  onSelect: (behaviorId: string | undefined) => void;
}

function BehaviorSelector({ behaviors, selectedBehaviorId, onSelect }: BehaviorSelectorProps) {
  const [query, setQuery] = useState('');
  const filteredBehaviors = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return behaviors.filter(behavior => behavior.name.toLowerCase().includes(trimmed));
  }, [behaviors, query]);
  const hasQuery = query.trim().length > 0;
  const selectedIsVisible = filteredBehaviors.some(behavior => behavior.id === selectedBehaviorId);

  useEffect(() => {
    if (selectedBehaviorId && !selectedIsVisible) {
      onSelect(undefined);
    }
  }, [onSelect, selectedBehaviorId, selectedIsVisible]);

  if (behaviors.length === 0) {
    return <Text style={styles.emptyInline}>No behaviors available.</Text>;
  }

  return (
    <View style={styles.behaviorPicker}>
      <View style={styles.behaviorSearchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color={Colors.text.faint}
        />
        <TextInput
          style={styles.behaviorSearchInput}
          placeholder="Search behaviors"
          placeholderTextColor={Colors.text.faint}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              onSelect(undefined);
            }}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={17}
              color={Colors.text.faint}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.behaviorList}>
        {!hasQuery ? null : filteredBehaviors.length === 0 ? (
          <Text style={styles.emptyInline}>No matching behaviors.</Text>
        ) : (
          filteredBehaviors.map(behavior => {
            const active = behavior.id === selectedBehaviorId;
            return (
              <Pressable
                key={behavior.id}
                style={({ pressed }) => [
                  styles.behaviorRow,
                  active && styles.behaviorRowActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelect(behavior.id)}
              >
                <BehaviorIcon
                  behavior={behavior}
                  size={22}
                />
                <Text
                  style={[styles.behaviorRowText, active && styles.behaviorRowTextActive]}
                  numberOfLines={1}
                >
                  {behavior.name}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Colors.text.primary}
                  />
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

interface StarPickerProps {
  value: TaskStarValue;
  onChange: (value: TaskStarValue) => void;
}

function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <View
      style={styles.starPicker}
      accessibilityLabel={`${value} stars`}
    >
      {([1, 2, 3] as TaskStarValue[]).map(starValue => {
        const active = starValue <= value;
        return (
          <Pressable
            key={starValue}
            style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} stars`}
          >
            <Ionicons
              name={active ? 'star' : 'star-outline'}
              size={22}
              color={active ? Colors.star.filled : Colors.star.empty}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

interface TaskCardProps {
  task: TaskEntry;
  behavior: BehaviorEntry | undefined;
  selectedDate: string;
  onToggle: () => void;
  onRemove: () => void;
}

function TaskCard({ task, behavior, selectedDate, onToggle, onRemove }: TaskCardProps) {
  const complete = isTaskCompleteOnDate(task, selectedDate);

  return (
    <View style={[styles.taskCard, complete && styles.taskCardComplete]}>
      <Pressable
        style={styles.taskMain}
        onPress={onToggle}
      >
        <Ionicons
          name={complete ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={complete ? Colors.status.successLight : Colors.text.faint}
        />
        <View style={styles.taskTextStack}>
          <View style={styles.taskTitleRow}>
            {behavior ? (
              <BehaviorIcon
                behavior={behavior}
                size={18}
              />
            ) : null}
            <Text
              style={[styles.taskTitle, complete && styles.taskTitleComplete]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
          <View style={styles.taskMetaRow}>
            {task.behaviorId ? (
              <Text style={styles.taskMeta}>Behavior task</Text>
            ) : (
              <Text style={styles.taskMeta}>One-off</Text>
            )}
            {task.stars > 0 && <TaskStarRow stars={task.stars} />}
          </View>
        </View>
      </Pressable>
      <Button
        variant="icon"
        onPress={onRemove}
        accessibilityLabel={`Remove ${task.title}`}
        style={styles.removeButton}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={Colors.text.faint}
        />
      </Button>
    </View>
  );
}

function TaskStarRow({ stars }: { stars: TaskStarValue }) {
  return (
    <View style={styles.taskStars}>
      {Array.from({ length: stars }).map((_, index) => (
        <Ionicons
          key={index}
          name="star"
          size={12}
          color={Colors.star.filled}
        />
      ))}
      <Text style={styles.taskStarsText}>{stars}</Text>
    </View>
  );
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
  composer: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.primary,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: Colors.bg.input,
  },
  modeLabel: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: Colors.text.primary,
  },
  titleInput: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  behaviorPicker: {
    gap: 10,
  },
  behaviorSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  behaviorSearchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 14,
    paddingVertical: 0,
  },
  behaviorList: {
    gap: 6,
    maxHeight: 220,
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  behaviorRowActive: {
    borderColor: Colors.text.light,
    backgroundColor: Colors.bg.elevated,
  },
  behaviorRowText: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  behaviorRowTextActive: {
    color: Colors.text.primary,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  starPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  starButton: {
    padding: 3,
  },
  behaviorAddButton: {
    flex: 1,
  },
  listHeader: {
    paddingTop: 4,
  },
  scheduledList: {
    flex: 1,
  },
  scheduledContent: {
    gap: 6,
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
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    overflow: 'hidden',
  },
  taskCardComplete: {
    backgroundColor: Colors.bg.darker,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  taskTextStack: {
    flex: 1,
    gap: 3,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  taskTitleComplete: {
    color: Colors.text.muted,
    textDecorationLine: 'line-through',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskMeta: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  taskStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  taskStarsText: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  removeButton: {
    width: 42,
    height: '100%',
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 24,
  },
  emptyInline: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.72,
  },
});
