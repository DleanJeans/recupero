import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { AppIcon } from '../../../components/app-icon';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useTimerStore } from '../../../store/timer-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { SavedPlace } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { getPlaceEmoji } from '../../../utils/cue-utils';
import { formatDateDisplay } from '../../../utils/date-utils';
import { launchApp } from '../../../utils/launch-app';
import { formatBugSummary, getBugHeat } from '../../../utils/task-bug-utils';
import {
  formatEstimate,
  formatStartTime,
  getDeadlineState,
  getTaskActualTime,
  getTaskEstimateMin,
} from '../../../utils/task-schedule-utils';
import { formatTaskTime } from '../../../utils/task-time-utils';
import { formatTimeRange } from '../../../utils/time-utils';
import { BugHeatBar } from './bug-heat-bar';
import { TaskCheckbox } from './task-checkbox';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TASK_CARD_LAYOUT = LinearTransition.duration(240);

interface TaskCardProps {
  task: TaskEntry;
  behavior: BehaviorEntry | undefined;
  place?: SavedPlace;
  complete: boolean;
  /** Today (yyyy-MM-dd), to tell whether the deadline has come. */
  todayStr: string;
  /** Picked as one of "Today's 3": drawn bigger with a blue edge. */
  focused?: boolean;
  /** App to open right after the timer starts: the task's own app, else (Shopping tab) the Shopping timer app setting. */
  openAppPackage?: string;
  /** Total time spent on the task over all its timed logs; the chip is hidden under a minute. */
  timeSpentMs?: number;
  /** The task's timer has been started: no play button, blue highlight. */
  timerRunning?: boolean;
  /** Open task whose start time is behind us: drawn red with a chip offering the next start time. */
  startPassed?: boolean;
  /** Chip offering a new start time (late or overlapping): its text and the "HH:mm" it moves the task to. */
  reschedule?: { text: string; startTime: string };
  onReschedule?: (task: TaskEntry, startTime: string) => void;
  /** Extra text for the second line, e.g. "Got it Nov 18". */
  note?: string;
  /** Select mode: the box shows whether the task is selected (undefined = not selecting). */
  selected?: boolean;
  /** Swipe right to log "Bugged me". Swiping is off when not set. */
  onBug?: (task: TaskEntry) => void;
  onToggle: (task: TaskEntry) => void;
  onLongPress: (task: TaskEntry) => void;
}

function TaskCardComponent({
  task,
  behavior,
  place,
  complete,
  todayStr,
  timerRunning,
  startPassed,
  reschedule,
  onReschedule,
  focused,
  note,
  openAppPackage,
  timeSpentMs,
  selected,
  onBug,
  onToggle,
  onLongPress,
}: TaskCardProps) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const navigation = useNavigation<NavigationProp>();
  const startTimer = useTimerStore(s => s.start);
  const showBehaviorName = behavior != null && behavior.name.trim() !== task.title.trim();
  const completedDate = complete ? task.completedDates.at(-1) : undefined;
  const actualTime = completedDate ? getTaskActualTime(task, behavior, completedDate) : undefined;
  // The place's own icon (emoji, mix, stack or image) leads the second line instead of a pin character.
  const placeName = place?.name ?? task.oneOffPlace?.name;
  const placeIcon = place ? getPlaceEmoji(place) : task.oneOffPlace ? task.oneOffPlace.emoji || '📍' : undefined;
  const metaParts = [
    showBehaviorName ? behavior.name : undefined,
    task.appLabel && task.appLabel !== behavior?.name && task.appLabel !== task.title ? task.appLabel : undefined,
    actualTime
      ? `Done ${formatTimeRange(actualTime.start ?? actualTime.end, actualTime.start ? actualTime.end : undefined)}`
      : undefined,
    !complete && task.startTime ? formatStartTime(task.startTime) : undefined,
    !complete && (task.estimateMin || task.startTime) ? `~${formatEstimate(getTaskEstimateMin(task))}` : undefined,
    task.deadline && !complete
      ? `Due ${formatDateDisplay(task.deadline).replace(/, \d{4}$/, '')}${task.deadlineTime ? ` ${formatStartTime(task.deadlineTime)}` : ''}`
      : undefined,
    note,
  ].filter((part): part is string => Boolean(part));
  const deadlineState = complete ? 'none' : getDeadlineState(task, todayStr);
  const now = Date.now();
  const bugSummary = complete ? undefined : formatBugSummary(task, now);
  const bugHeat = getBugHeat(task.bugs, now);
  const timeLabel = timeSpentMs != null ? formatTaskTime(timeSpentMs) : undefined;
  const canTrack =
    selected === undefined &&
    !complete &&
    !timerRunning &&
    (behavior != null ? task.timed === true || behavior.durationXpEnabled === true : task.timed === true);

  const handlePlay = () => {
    if (!canTrack) return;
    // A timed task without a behavior keeps its own timer: ticking it saves the time on the task.
    if (!behavior) {
      useBehaviorStore.getState().setTaskTimer(task.id, Date.now());
      return;
    }
    const opened = openAppPackage ? launchApp(openAppPackage) : false;
    startTimer(behavior.id, Date.now(), task.title, opened ? openAppPackage : undefined, task.id);
    navigation.navigate('Timer');
  };

  const card = (
    <Animated.View
      layout={TASK_CARD_LAYOUT}
      style={[
        styles.taskCard,
        focused && styles.focusCard,
        deadlineState === 'today' && styles.dueTodayCard,
        (deadlineState === 'overdue' || (startPassed && !complete)) && styles.overdueCard,
        timerRunning && !complete && styles.runningCard,
        complete && styles.taskCardComplete,
      ]}
    >
      <Pressable
        style={[styles.taskMain, focused && styles.focusMain]}
        onPress={() => onLongPress(task)}
        onLongPress={() => onLongPress(task)}
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityHint={selected === undefined ? 'Opens the task menu' : 'Selects or unselects the task'}
      >
        <TaskCheckbox
          checked={selected ?? complete}
          onPress={() => onToggle(task)}
          label={task.title}
        />
        <View style={styles.taskTextStack}>
          <View style={styles.taskTitleRow}>
            {task.icon ? (
              <AppIcon
                value={task.icon}
                size={18}
              />
            ) : behavior ? (
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
          {bugSummary && <BugHeatBar heat={bugHeat} />}
          {!complete && reschedule && onReschedule && (
            <Pressable
              style={styles.moveChip}
              onPress={() => onReschedule(task, reschedule.startTime)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Move start to ${formatStartTime(reschedule.startTime)}`}
            >
              <Text
                style={styles.moveChipText}
                numberOfLines={1}
              >
                {reschedule.text}
              </Text>
            </Pressable>
          )}
          {(bugSummary || placeName || metaParts.length > 0) && (
            <View style={styles.metaRow}>
              {placeName && placeIcon && (
                <View style={styles.placeChip}>
                  <AppIcon
                    value={placeIcon}
                    size={11}
                  />
                  <Text
                    style={styles.taskMeta}
                    numberOfLines={1}
                  >
                    {placeName}
                  </Text>
                </View>
              )}
              {(bugSummary || metaParts.length > 0) && (
                <Text
                  style={[styles.taskMeta, styles.metaText]}
                  numberOfLines={1}
                >
                  {bugSummary && <Text style={bugHeat >= 1 ? styles.bugMetaHot : undefined}>{bugSummary}</Text>}
                  {bugSummary && metaParts.length > 0 ? ' · ' : ''}
                  {metaParts.join(' · ')}
                </Text>
              )}
            </View>
          )}
        </View>
        {timeLabel && (
          <View style={styles.timeChip}>
            <Ionicons
              name="time-outline"
              size={12}
              color={Colors.text.muted}
            />
            <Text
              style={styles.timeText}
              numberOfLines={1}
            >
              {timeLabel}
            </Text>
          </View>
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

  if (!onBug || complete || selected !== undefined) return card;
  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      overshootLeft={false}
      leftThreshold={72}
      containerStyle={styles.swipeContainer}
      renderLeftActions={() => (
        <View style={styles.swipeAction}>
          <Text
            style={styles.swipeText}
            numberOfLines={1}
          >
            Bugged me +1
          </Text>
        </View>
      )}
      onSwipeableOpen={() => {
        // Only left-side actions exist, so any open is the "Bugged me" swipe.
        swipeRef.current?.close();
        onBug(task);
      }}
    >
      {card}
    </ReanimatedSwipeable>
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
  dueTodayCard: {
    backgroundColor: '#3a1a1a',
  },
  overdueCard: {
    backgroundColor: '#5a1f1f',
  },
  runningCard: {
    backgroundColor: '#16283f',
    borderWidth: 1,
    borderColor: '#4a9eff',
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
  bugMetaHot: {
    color: '#FDBA74',
  },
  swipeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeAction: {
    width: 150,
    justifyContent: 'center',
    paddingLeft: 16,
    backgroundColor: '#C2410C',
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  moveChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#7a2a2a',
  },
  moveChipText: { color: '#ffd5d5', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1, maxWidth: '55%' },
  metaText: { flexShrink: 1 },
  taskMeta: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    minWidth: 40,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.bg.darker,
  },
  timeText: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  playButton: {
    alignSelf: 'stretch',
    width: 44,
  },
});
