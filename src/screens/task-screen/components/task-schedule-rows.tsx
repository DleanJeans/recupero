import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';
import { formatDateDisplay } from '../../../utils/date-utils';
import { findPreviousStep } from '../../../utils/task-chain-utils';
import { pickTaskDate, pickTaskTime } from '../../../utils/task-date-pick';
import {
  DEFAULT_ESTIMATE_MIN,
  ESTIMATE_STEP_MIN,
  formatEstimate,
  formatStartTime,
  MAX_ESTIMATE_MIN,
} from '../../../utils/task-schedule-utils';
import { AttachRow } from './task-attach-row';
import { TaskNextStepSheet } from './task-next-step-sheet';

export interface TaskSchedule {
  scheduledDate: string;
  startTime?: string;
  estimateMin?: number;
  nextTaskId?: string;
  deadline?: string;
  deadlineTime?: string;
}

interface TaskScheduleRowsProps {
  schedule: TaskSchedule;
  onChange: (schedule: TaskSchedule) => void;
  /** Average length of the selected behavior's timed logs, offered as the estimate. */
  suggestedMin?: number;
  /** The task being edited (unset for a new task). */
  taskId?: string;
}

const ICON_SIZE = 18;

function RowIcon({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <Ionicons
      name={name}
      size={ICON_SIZE}
      color={Colors.text.muted}
    />
  );
}

/** Date, start time, estimated duration and deadline rows of the task editor. */
export function TaskScheduleRows({ schedule, onChange, suggestedMin, taskId }: TaskScheduleRowsProps) {
  const { scheduledDate, startTime, nextTaskId, deadline, deadlineTime } = schedule;
  const estimateMin = schedule.estimateMin ?? DEFAULT_ESTIMATE_MIN;
  const tasks = useBehaviorStore(state => state.tasks);
  const [pickingNext, setPickingNext] = useState(false);
  const previousStep = taskId ? findPreviousStep(tasks ?? [], taskId) : undefined;
  const nextTask = nextTaskId ? tasks?.find(task => task.id === nextTaskId) : undefined;
  const set = (patch: Partial<TaskSchedule>) => onChange({ ...schedule, ...patch });
  const stepEstimate = (delta: number) => {
    set({ estimateMin: Math.max(ESTIMATE_STEP_MIN, Math.min(MAX_ESTIMATE_MIN, estimateMin + delta)) });
  };
  const showSuggestion = suggestedMin != null && estimateMin !== suggestedMin;

  return (
    <View>
      <View style={styles.rows}>
        <AttachRow
          icon={<RowIcon name="calendar-outline" />}
          label="Date"
          value={formatDateDisplay(scheduledDate)}
          onPress={() => pickTaskDate(scheduledDate, date => set({ scheduledDate: date }))}
        />
        <AttachRow
          icon={<RowIcon name="alarm-outline" />}
          label="Start"
          value={previousStep ? `After ${previousStep.title}` : startTime ? formatStartTime(startTime) : undefined}
          onPress={() => {
            // A next step starts when the previous task ends, so its start can't be picked.
            if (!previousStep) pickTaskTime(startTime, time => set({ startTime: time }));
          }}
          onClear={!previousStep && startTime ? () => set({ startTime: undefined }) : undefined}
        />
        <View style={styles.estimateRow}>
          <View style={styles.rowIcon}>
            <RowIcon name="hourglass-outline" />
          </View>
          <Text
            style={styles.rowLabel}
            numberOfLines={1}
          >
            Estimate
          </Text>
          <Text
            style={styles.estimateValue}
            numberOfLines={1}
          >
            {formatEstimate(estimateMin)}
          </Text>
          <Pressable
            style={styles.stepper}
            onPress={() => stepEstimate(-ESTIMATE_STEP_MIN)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Less estimated time"
          >
            <Ionicons
              name="remove"
              size={18}
              color={Colors.text.primary}
            />
          </Pressable>
          <Pressable
            style={styles.stepper}
            onPress={() => stepEstimate(ESTIMATE_STEP_MIN)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="More estimated time"
          >
            <Ionicons
              name="add"
              size={18}
              color={Colors.text.primary}
            />
          </Pressable>
        </View>
        <AttachRow
          icon={<RowIcon name="arrow-down-outline" />}
          label="Next step"
          value={nextTask?.title}
          onPress={() => setPickingNext(true)}
          onClear={nextTaskId ? () => set({ nextTaskId: undefined }) : undefined}
        />
        <AttachRow
          icon={<RowIcon name="flag-outline" />}
          label="Deadline"
          value={
            deadline
              ? `${formatDateDisplay(deadline)}${deadlineTime ? `, ${formatStartTime(deadlineTime)}` : ''}`
              : undefined
          }
          onPress={() =>
            // Date first, then an optional time: cancelling the time picker keeps a date-only deadline.
            pickTaskDate(deadline ?? scheduledDate, date => {
              set({ deadline: date, deadlineTime: undefined });
              pickTaskTime(deadlineTime, time => onChange({ ...schedule, deadline: date, deadlineTime: time }));
            })
          }
          onClear={deadline ? () => set({ deadline: undefined, deadlineTime: undefined }) : undefined}
          last
        />
      </View>
      {pickingNext && (
        <TaskNextStepSheet
          taskId={taskId}
          onPick={id => {
            set({ nextTaskId: id });
            setPickingNext(false);
          }}
          onClose={() => setPickingNext(false)}
        />
      )}
      {showSuggestion && (
        <Pressable
          style={styles.suggestion}
          onPress={() => set({ estimateMin: suggestedMin })}
          accessibilityRole="button"
          accessibilityLabel={`Use ${formatEstimate(suggestedMin)} as the estimate`}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={Colors.text.muted}
          />
          <Text
            style={styles.suggestionText}
            numberOfLines={1}
          >
            {`Use average ${formatEstimate(suggestedMin)}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { backgroundColor: Colors.bg.input, borderRadius: 12, overflow: 'hidden' },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.bg.card,
  },
  rowIcon: { width: 26, alignItems: 'center' },
  rowLabel: { width: 68, color: Colors.text.muted, fontSize: 13 },
  estimateValue: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.bg.input,
  },
  suggestionText: { color: Colors.text.primary, fontSize: 13, flexShrink: 0 },
});
