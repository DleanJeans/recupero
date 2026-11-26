import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  /** Planned drive: starts the Driving timer. */
  onStart?: () => void;
  /** Planned drive: tapping the card opens its menu (edit estimate, open Google Maps). */
  onOpenMenu?: () => void;
}

/** Timeline card for the drive to a task's place: planned (leave time and a Start pill) or done (when it happened). */
export function TaskDriveNode({ placeName, minutes, leaveAt, range, onStart, onOpenMenu }: TaskDriveNodeProps) {
  const done = range != null;
  const detail = range
    ? `${minutes}m · ${formatTimeRange(range.start, range.end)}`
    : `~${minutes}m${leaveAt != null ? ` · Leave ${formatStartTime(toStartTime(new Date(leaveAt)))}` : ''}`;
  return (
    <Pressable
      style={[styles.card, done && styles.cardDone]}
      onPress={onOpenMenu}
      disabled={!onOpenMenu}
      accessibilityRole={onOpenMenu ? 'button' : undefined}
      accessibilityLabel={onOpenMenu ? `Drive to ${placeName} options` : undefined}
    >
      <Text style={styles.emoji}>🚗</Text>
      <View style={styles.text}>
        <Text
          style={[styles.title, done && styles.titleDone]}
          numberOfLines={1}
        >
          {`${done ? 'Drove to' : 'Drive to'} ${placeName}`}
        </Text>
        <Text
          style={[styles.detail, done && styles.detailDone]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      </View>
      {onStart && (
        <Pressable
          style={({ pressed }) => [styles.start, pressed && styles.pressed]}
          onPress={onStart}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Start driving to ${placeName}`}
        >
          <Ionicons
            name="play"
            size={13}
            color="#fff"
          />
          <Text
            style={styles.startText}
            numberOfLines={1}
          >
            Start
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#14202e',
    borderWidth: 1,
    borderColor: '#23415f',
    borderRadius: 14,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    minHeight: 48,
  },
  cardDone: { backgroundColor: Colors.bg.card, borderColor: Colors.bg.input },
  emoji: { fontSize: 20 },
  text: { flex: 1, minWidth: 0 },
  title: { color: '#dbeafe', fontSize: 14, fontWeight: '700' },
  titleDone: { color: Colors.text.muted },
  detail: { color: '#93c5fd', fontSize: 12, marginTop: 2 },
  detailDone: { color: Colors.text.faint },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  startText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
