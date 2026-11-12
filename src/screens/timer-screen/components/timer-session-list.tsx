import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { getLogDurationMs } from '../../../utils/log-utils';
import { formatDuration, formatTime } from '../../../utils/time-utils';
import { getTodayTimedLogs, getTotalLogDurationMs } from '../../../utils/timer-utils';
import { getLogXp } from '../../../utils/xp-utils';

interface TimerSessionListProps {
  behavior: BehaviorEntry;
  /** Start of the segment still on the clock (running or stopped, not yet logged). */
  currentStart: number | undefined;
  currentElapsedMs: number;
  isRunning: boolean;
}

/** Today's sessions of the timed behaviour, newest first, with the one on the clock on top. Tap a saved one to edit it. */
export function TimerSessionList({ behavior, currentStart, currentElapsedMs, isRunning }: TimerSessionListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  // Recompute when a log is added or edited, not on every tick of the clock.
  const logs = useMemo(() => getTodayTimedLogs(behavior, Date.now(), dayCutoffHour), [behavior, dayCutoffHour]);
  const totalMs = getTotalLogDurationMs(logs) + (currentStart != null ? currentElapsedMs : 0);

  if (logs.length === 0 && currentStart == null) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today · {formatDuration(totalMs)}</Text>
      {currentStart != null && (
        <View style={[styles.row, styles.currentRow]}>
          <Text style={styles.rowTime}>
            {isRunning ? '● Now' : 'Not logged'} · {formatTime(currentStart)} –
          </Text>
          <Text style={styles.currentDuration}>{formatDuration(currentElapsedMs)}</Text>
        </View>
      )}
      {logs.map(log => (
        <Pressable
          key={log.id}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => navigation.navigate('BehaviorLog', { behaviorId: behavior.id, logId: log.id })}
          accessibilityRole="button"
          accessibilityLabel={`Edit session ${formatTime(log.timestamp)}`}
        >
          <Text style={styles.rowTime}>
            {formatTime(log.timestamp)} – {formatTime(log.endTimestamp ?? log.timestamp)}
          </Text>
          <Text style={styles.rowMeta}>
            {formatDuration(getLogDurationMs(log))} · +{getLogXp(log)} XP
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 7,
  },
  heading: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bg.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  currentRow: {
    borderColor: '#2f6f45',
  },
  pressed: {
    opacity: 0.75,
  },
  rowTime: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  rowMeta: {
    color: Colors.text.light,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  currentDuration: {
    color: Colors.typeText.desirable,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
