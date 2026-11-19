import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import type { TimerSession } from '../store/timer-store';
import { Colors } from '../utils/colors';
import { formatStopwatchDuration } from '../utils/stopwatch-utils';
import { BehaviorIcon } from './behavior-icon';
import { Text } from './text';

interface TimerPillProps {
  session: TimerSession;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** One timer's pill: green while running, grey when paused or waiting to be logged. */
export function TimerPill({ session, onPress, style }: TimerPillProps) {
  const { lockedBehaviorId, startTimestamp, stopTimestamp, pausedAt } = session;
  const behavior = useBehaviorStore(s => s.behaviors.find(b => b.id === lockedBehaviorId));
  const behaviorName = behavior?.name;
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
        {behavior && (
          <View style={[styles.iconCircle, !isRunning && styles.iconCircleStopped]}>
            <BehaviorIcon
              behavior={behavior}
              size={14}
            />
          </View>
        )}
        <Ionicons
          name={isPaused ? 'pause' : 'stopwatch-outline'}
          size={15}
          color={isRunning ? Colors.typeText.desirable : Colors.text.secondary}
        />
        <Text
          style={[styles.name, !isRunning && styles.textStopped]}
          numberOfLines={1}
        >
          {behaviorName}
        </Text>
        <Text
          style={[styles.time, !isRunning && styles.textStopped]}
          numberOfLines={1}
        >
          · {elapsed}
          {hint}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 0,
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
  // The behavior's icon in a circle, at the pill's left edge.
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iconCircleStopped: { opacity: 0.6 },
  // The name gives way first, so the time (1:05:12, hint) is never cut off.
  name: { color: Colors.typeText.desirable, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  time: { color: Colors.typeText.desirable, fontSize: 13, fontWeight: '600', flexShrink: 0 },
  textStopped: { color: Colors.text.secondary },
});
