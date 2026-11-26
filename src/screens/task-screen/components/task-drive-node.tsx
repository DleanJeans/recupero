import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatStartTime, toStartTime } from '../../../utils/task-schedule-utils';
import { formatTimeRange } from '../../../utils/time-utils';

interface TaskDriveNodeProps {
  placeName: string;
  minutes: number;
  /** Planned drive: when to leave. */
  leaveAt?: number;
  /** Finished drive. */
  range?: { start: number; end: number };
  /** Tap to start the drive (planned drives only). */
  onPress?: () => void;
}

/** Timeline marker for the drive to a task's place: planned (leave by) or done (when it happened). */
export function TaskDriveNode({ placeName, minutes, leaveAt, range, onPress }: TaskDriveNodeProps) {
  const done = range != null;
  const label = `${done ? 'Drove to' : 'Drive to'} ${placeName} · ${minutes}m`;
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Start driving to ${placeName}` : undefined}
    >
      <Text style={styles.emoji}>🚗</Text>
      <Text
        style={styles.text}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={styles.time}
        numberOfLines={1}
      >
        {range
          ? formatTimeRange(range.start, range.end)
          : leaveAt != null
            ? `Leave ${formatStartTime(toStartTime(new Date(leaveAt)))}`
            : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32 },
  emoji: { fontSize: 16 },
  text: { flex: 1, color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  time: { color: Colors.text.faint, fontSize: 12, fontWeight: '700', flexShrink: 0, textAlign: 'right' },
});
