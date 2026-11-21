import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useTimerStore } from '../../../store/timer-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { SavedPlace } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { getPlaceIconText } from '../../../utils/cue-utils';
import { launchApp } from '../../../utils/launch-app';
import { TaskCheckbox } from './task-checkbox';
import { TaskRewardChip } from './task-reward-chip';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TASK_CARD_LAYOUT = LinearTransition.duration(240);

interface TaskCardProps {
  task: TaskEntry;
  behavior: BehaviorEntry | undefined;
  place?: SavedPlace;
  complete: boolean;
  /** Picked as one of "Today's 3": drawn bigger with a blue edge. */
  focused?: boolean;
  /** App to open right after the timer starts: the task's own app, else (Shopping tab) the Shopping timer app setting. */
  openAppPackage?: string;
  /** Extra text for the second line, e.g. "Got it Nov 18". */
  note?: string;
  onToggle: (task: TaskEntry) => void;
  onLongPress: (task: TaskEntry) => void;
}

function TaskCardComponent({
  task,
  behavior,
  place,
  complete,
  focused,
  note,
  openAppPackage,
  onToggle,
  onLongPress,
}: TaskCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const startTimer = useTimerStore(s => s.start);
  const showBehaviorName = behavior != null && behavior.name.trim() !== task.title.trim();
  const metaParts = [
    showBehaviorName ? behavior.name : undefined,
    task.appLabel && task.appLabel !== behavior?.name && task.appLabel !== task.title ? task.appLabel : undefined,
    place ? `${getPlaceIconText(place)} ${place.name}` : undefined,
    note,
  ].filter((part): part is string => Boolean(part));
  const canTrack = !complete && behavior != null && (task.timed === true || behavior.durationXpEnabled === true);

  const handlePlay = () => {
    if (!behavior || !canTrack) return;
    const opened = openAppPackage ? launchApp(openAppPackage) : false;
    startTimer(behavior.id, Date.now(), task.title, opened ? openAppPackage : undefined);
    navigation.navigate('Timer');
  };

  return (
    <Animated.View
      layout={TASK_CARD_LAYOUT}
      style={[styles.taskCard, focused && styles.focusCard, complete && styles.taskCardComplete]}
    >
      <Pressable
        style={[styles.taskMain, focused && styles.focusMain]}
        onPress={() => onLongPress(task)}
        onLongPress={() => onLongPress(task)}
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityHint="Opens the task menu"
      >
        <TaskCheckbox
          checked={complete}
          onPress={() => onToggle(task)}
          label={task.title}
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
              style={[styles.taskTitle, focused && styles.focusTitle, complete && styles.taskTitleComplete]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
          {metaParts.length > 0 && (
            <Text
              style={styles.taskMeta}
              numberOfLines={1}
            >
              {metaParts.join(' · ')}
            </Text>
          )}
        </View>
        {task.stars > 0 && (
          <TaskRewardChip
            stars={task.stars}
            earned={complete}
          />
        )}
      </Pressable>
      {canTrack && (
        <Button
          variant="icon"
          onPress={handlePlay}
          accessibilityLabel={`Start timer for ${task.title}`}
          style={styles.playButton}
        >
          <Ionicons
            name="play"
            size={18}
            color={Colors.text.primary}
          />
        </Button>
      )}
    </Animated.View>
  );
}

export const TaskCard = React.memo(TaskCardComponent);

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  focusCard: {
    backgroundColor: '#1f2430',
    borderWidth: 1,
    borderColor: '#2f3b55',
  },
  taskCardComplete: {
    backgroundColor: Colors.bg.darker,
    borderColor: Colors.bg.darker,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  focusMain: {
    paddingVertical: 14,
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
  focusTitle: {
    fontSize: 16,
  },
  taskTitleComplete: {
    color: Colors.text.muted,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
    alignSelf: 'stretch',
    width: 44,
  },
});
