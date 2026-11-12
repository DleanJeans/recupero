import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useTimerStore } from '../store/timer-store';
import { Colors } from '../utils/colors';
import { formatStopwatchDuration } from '../utils/stopwatch-utils';
import { Text } from './text';

interface RunningTimerPillProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floats above the bottom nav while a timer is running or waiting to be logged, since Timer has no tab.
 * On Routines it sits above the Add behavior button instead (see FloatingPills).
 */
export function RunningTimerPill({ onPress, style }: RunningTimerPillProps) {
  const lockedBehaviorId = useTimerStore(s => s.lockedBehaviorId);
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const pausedAt = useTimerStore(s => s.pausedAt);
  const behaviorName = useBehaviorStore(s => s.behaviors.find(b => b.id === lockedBehaviorId)?.name);
  const isRunning = startTimestamp != null && stopTimestamp == null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const isPaused = pausedAt != null && startTimestamp == null;
  if ((startTimestamp == null && !isPaused) || behaviorName == null) return null;

  const elapsed =
    startTimestamp == null ? 'paused' : formatStopwatchDuration(Math.max(0, (stopTimestamp ?? now) - startTimestamp));
  const hint = isRunning ? '' : isPaused ? ' · tap to resume' : ' · tap to log';

  return (
    <View
      style={[styles.wrap, style]}
      pointerEvents="box-none"
    >
      <Pressable
        style={({ pressed }) => [styles.pill, !isRunning && styles.pillStopped, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open timer for ${behaviorName}, ${elapsed}`}
      >
        {isRunning && <View style={styles.dot} />}
        <Ionicons
          name={isPaused ? 'pause' : 'stopwatch-outline'}
          size={15}
          color={isRunning ? Colors.typeText.desirable : Colors.text.secondary}
        />
        <Text
          style={[styles.text, !isRunning && styles.textStopped]}
          numberOfLines={1}
        >
          {behaviorName} · {elapsed}
          {hint}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: Colors.bg.primary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '86%',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.typeBtn.desirable,
  },
  pillStopped: { backgroundColor: Colors.bg.elevated },
  pressed: { opacity: 0.8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.type.desirable },
  text: { color: Colors.typeText.desirable, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  textStopped: { color: Colors.text.secondary },
});
