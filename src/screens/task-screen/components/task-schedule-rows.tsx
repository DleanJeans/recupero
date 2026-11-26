import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatDateDisplay } from '../../../utils/date-utils';
import { pickTaskDate, pickTaskTime } from '../../../utils/task-date-pick';
import {
  ESTIMATE_STEP_MIN,
  formatEstimate,
  formatStartTime,
  MAX_ESTIMATE_MIN,
} from '../../../utils/task-schedule-utils';
import { AttachRow } from './task-attach-row';

export interface TaskSchedule {
  scheduledDate: string;
  startTime?: string;
  estimateMin?: number;
  deadline?: string;
}

interface TaskScheduleRowsProps {
  schedule: TaskSchedule;
  onChange: (schedule: TaskSchedule) => void;
  /** Average length of the selected behavior's timed logs, offered as the estimate. */
  suggestedMin?: number;
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
export function TaskScheduleRows({ schedule, onChange, suggestedMin }: TaskScheduleRowsProps) {
  const { scheduledDate, startTime, estimateMin, deadline } = schedule;
  const set = (patch: Partial<TaskSchedule>) => onChange({ ...schedule, ...patch });
  const stepEstimate = (delta: number) => {
    const next = Math.max(0, Math.min(MAX_ESTIMATE_MIN, (estimateMin ?? 0) + delta));
    set({ estimateMin: next > 0 ? next : undefined });
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
          value={startTime ? formatStartTime(startTime) : undefined}
          onPress={() => pickTaskTime(startTime, time => set({ startTime: time }))}
          onClear={startTime ? () => set({ startTime: undefined }) : undefined}
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
            style={[styles.estimateValue, estimateMin == null && styles.none]}
            numberOfLines={1}
          >
            {estimateMin != null ? formatEstimate(estimateMin) : 'None'}
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
          icon={<RowIcon name="flag-outline" />}
          label="Deadline"
          value={deadline ? formatDateDisplay(deadline) : undefined}
          onPress={() => pickTaskDate(deadline ?? scheduledDate, date => set({ deadline: date }))}
          onClear={deadline ? () => set({ deadline: undefined }) : undefined}
          last
        />
      </View>
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
  none: { color: Colors.text.faint },
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
