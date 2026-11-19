import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { isTimerSessionActive, useTimerStore } from '../store/timer-store';
import { TimerPill } from './timer-pill';

interface RunningTimerPillProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Small chips side by side instead of full pills (Routines while scrolled down). */
  compact?: boolean;
}

/**
 * One pill per timer (the open one first, the others stacked below), floating above the bottom nav while a timer
 * is running or waiting to be logged, since Timer has no tab. Tapping another timer's pill opens it.
 * On Routines it sits above the Add behavior button instead (see DockingPills), and shrinks to small chips while the
 * list is scrolled down.
 */
export function RunningTimerPill({ onPress, style, compact = false }: RunningTimerPillProps) {
  const lockedBehaviorId = useTimerStore(s => s.lockedBehaviorId);
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const pendingLogBehaviorLogCount = useTimerStore(s => s.pendingLogBehaviorLogCount);
  const pausedAt = useTimerStore(s => s.pausedAt);
  const initialNotes = useTimerStore(s => s.initialNotes);
  const parked = useTimerStore(s => s.parked);
  const switchTo = useTimerStore(s => s.switchTo);
  const current =
    lockedBehaviorId != null && isTimerSessionActive({ startTimestamp, pausedAt })
      ? { lockedBehaviorId, startTimestamp, stopTimestamp, pendingLogBehaviorLogCount, pausedAt, initialNotes }
      : undefined;
  if (!current && parked.length === 0) return null;
  return (
    <Animated.View
      style={compact ? styles.row : styles.column}
      pointerEvents="box-none"
    >
      {current && (
        <TimerPill
          session={current}
          onPress={onPress}
          style={compact ? undefined : style}
          compact={compact}
        />
      )}
      {parked.map(session => (
        <TimerPill
          key={session.lockedBehaviorId}
          session={session}
          style={compact ? undefined : style}
          compact={compact}
          onPress={() => {
            switchTo(session.lockedBehaviorId);
            onPress();
          }}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
