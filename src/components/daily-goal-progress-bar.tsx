import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';

interface DailyGoalProgressBarProps {
  current: number;
  after: number;
  goal: number;
  color?: string;
}

/** Two-tone static progress bar for "today's progress vs daily goal" use:
 *  solid fill for the current value, translucent overlay extending to the
 *  post-log value. Clamps both ratios to [0, 1]. When `after <= current` the
 *  overlay matches the solid fill so the bar never visually shrinks. */
export function DailyGoalProgressBar({
  current,
  after,
  goal,
  color = Colors.type.desirable,
}: DailyGoalProgressBarProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const currentRatio = Math.max(0, Math.min(1, current / safeGoal));
  const afterRatio = Math.max(currentRatio, Math.min(1, after / safeGoal));
  const overlayRatio = after > current ? afterRatio : currentRatio;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${currentRatio * 100}%` }]} />
      <View style={[styles.overlay, { backgroundColor: color, width: `${overlayRatio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
    opacity: 0.35,
  },
});
