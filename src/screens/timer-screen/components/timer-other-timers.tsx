import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { isTimerSessionActive, useTimerStore } from '../../../store/timer-store';
import { Colors } from '../../../utils/colors';
import { formatStopwatchDuration } from '../../../utils/stopwatch-utils';

/** Other timers running next to the open one (tap to open it), and a button to start one more. */
export function TimerOtherTimers() {
  const parked = useTimerStore(state => state.parked);
  const hasCurrent = useTimerStore(state => isTimerSessionActive(state));
  const switchTo = useTimerStore(state => state.switchTo);
  const parkCurrent = useTimerStore(state => state.parkCurrent);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (parked.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [parked.length]);

  if (parked.length === 0 && !hasCurrent) return null;
  return (
    <View style={styles.container}>
      {parked.length > 0 && <Text style={styles.label}>Other timers</Text>}
      {parked.map(session => {
        const name = behaviors.find(behavior => behavior.id === session.lockedBehaviorId)?.name;
        if (name == null) return null;
        const isPaused = session.startTimestamp == null;
        const isRunning = !isPaused && session.stopTimestamp == null;
        const elapsed = isPaused
          ? 'paused'
          : formatStopwatchDuration(Math.max(0, (session.stopTimestamp ?? now) - (session.startTimestamp ?? now)));
        return (
          <Pressable
            key={session.lockedBehaviorId}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => switchTo(session.lockedBehaviorId)}
            accessibilityRole="button"
            accessibilityLabel={`Open timer for ${name}, ${elapsed}`}
          >
            <Ionicons
              name={isPaused ? 'pause' : 'stopwatch-outline'}
              size={16}
              color={isRunning ? Colors.typeText.desirable : Colors.text.secondary}
            />
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={[styles.elapsed, isRunning && styles.elapsedRunning]}>{elapsed}</Text>
          </Pressable>
        );
      })}
      {hasCurrent && (
        <Button
          variant="secondary"
          onPress={parkCurrent}
        >
          + Start another timer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.bg.elevated,
  },
  pressed: { opacity: 0.8 },
  name: { flex: 1, color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  elapsed: { color: Colors.text.secondary, fontSize: 14, fontVariant: ['tabular-nums'] },
  elapsedRunning: { color: Colors.typeText.desirable },
});
