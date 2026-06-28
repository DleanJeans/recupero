import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BehaviorIcon } from '../../components/BehaviorIcon';
import { BottomNav } from '../../components/BottomNav';
import { Button } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
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

  useEffect(() => {
    if (selectedBehaviorId && availableBehaviors.some(behavior => behavior.id === selectedBehaviorId)) return;
    setSelectedBehaviorId(availableBehaviors[0]?.id);
  }, [availableBehaviors, selectedBehaviorId]);

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
      stars,
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
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

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>SCHEDULED</Text>
          {dayTasks.length === 0 ? (
            <Text style={styles.empty}>No tasks for this date.</Text>
          ) : (
            dayTasks.map(task => {
              const behavior = task.behaviorId ? behaviors.find(item => item.id === task.behaviorId) : undefined;
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  behavior={behavior}
                  selectedDate={selectedDate}
                  onToggle={() => toggleTaskCompletion(task.id, selectedDate)}
                  onRemove={() => confirmRemove(task)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

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
  onBehaviorSelect: (behaviorId: string) => void;
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

  return (
    <View style={styles.composer}>
      <View style={styles.modeRow}>
        <ModeButton
          label="One-off"
          icon="create-outline"
          active={mode === 'oneOff'}
          onPress={() => onModeChange('oneOff')}
        />
        <ModeButton
          label="Behavior"
          icon="repeat-outline"
          active={mode === 'behavior'}
          onPress={() => onModeChange('behavior')}
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
        <StarPicker
          value={stars}
          onChange={onStarsChange}
        />
        <Button
          variant="primary"
          size="sm"
          onPress={onAdd}
          disabled={!canAdd}
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
  onSelect: (behaviorId: string) => void;
}

function BehaviorSelector({ behaviors, selectedBehaviorId, onSelect }: BehaviorSelectorProps) {
  if (behaviors.length === 0) {
    return <Text style={styles.emptyInline}>No behaviors available.</Text>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.behaviorChips}
    >
      {behaviors.map(behavior => {
        const active = behavior.id === selectedBehaviorId;
        return (
          <Pressable
            key={behavior.id}
            style={({ pressed }) => [
              styles.behaviorChip,
              active && styles.behaviorChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => onSelect(behavior.id)}
          >
            <BehaviorIcon
              behavior={behavior}
              size={20}
            />
            <Text
              style={[styles.behaviorChipText, active && styles.behaviorChipTextActive]}
              numberOfLines={1}
            >
              {behavior.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
          size={26}
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
            <TaskStarRow stars={task.stars} />
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
          size={19}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 18,
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
  behaviorChips: {
    gap: 8,
    paddingRight: 12,
  },
  behaviorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 180,
  },
  behaviorChipActive: {
    borderColor: Colors.text.light,
  },
  behaviorChipText: {
    color: Colors.text.light,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  behaviorChipTextActive: {
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
  listSection: {
    gap: 8,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskCardComplete: {
    backgroundColor: Colors.bg.darker,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  taskTextStack: {
    flex: 1,
    gap: 6,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    color: Colors.text.primary,
    fontSize: 15,
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
    fontSize: 12,
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
    width: 48,
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
