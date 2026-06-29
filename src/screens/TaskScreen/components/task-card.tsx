import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { BehaviorIcon } from '../../../components/BehaviorIcon';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { isTaskCompleteOnDate } from '../../../utils/taskUtils';
import { TaskStarRow } from './task-star-row';

const TASK_CARD_LAYOUT = LinearTransition.duration(240);

interface TaskCardProps {
  task: TaskEntry;
  behavior: BehaviorEntry | undefined;
  selectedDate: string;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function TaskCardComponent({ task, behavior, selectedDate, onToggle, onEdit, onRemove }: TaskCardProps) {
  const complete = isTaskCompleteOnDate(task, selectedDate);
  const isBehaviorTask = task.source === 'behavior' || (!task.source && task.behaviorId);
  const taskMeta = isBehaviorTask ? 'Behavior task' : behavior ? `One-off · ${behavior.name}` : 'One-off';

  return (
    <Animated.View
      layout={TASK_CARD_LAYOUT}
      style={[styles.taskCard, complete && styles.taskCardComplete]}
    >
      <Pressable
        style={styles.taskMain}
        onPress={onToggle}
        onLongPress={onEdit}
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
            <Text
              style={styles.taskMeta}
              numberOfLines={1}
            >
              {taskMeta}
            </Text>
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
    </Animated.View>
  );
}

export const TaskCard = React.memo(TaskCardComponent, (prev, next) => {
  return prev.task === next.task && prev.behavior === next.behavior && prev.selectedDate === next.selectedDate;
});

const styles = StyleSheet.create({
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
    flexShrink: 1,
  },
  removeButton: {
    alignSelf: 'stretch',
    width: 42,
  },
});
