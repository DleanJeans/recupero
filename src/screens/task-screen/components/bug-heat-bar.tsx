import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';
import { getBugHeatFill } from '../../../utils/task-bug-utils';

interface BugHeatBarProps {
  heat: number;
}

/** Thin bar under a task title that fills as the task keeps bugging the user and cools over time. */
export function BugHeatBar({ heat }: BugHeatBarProps) {
  const fill = getBugHeatFill(heat);
  return (
    <View
      style={styles.track}
      accessibilityLabel={`Bug heat ${Math.round(fill * 100)} percent`}
    >
      <View style={[styles.fill, { width: `${Math.round(fill * 100)}%` }, fill >= 0.75 && styles.hot]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.bg.elevated, overflow: 'hidden', marginTop: 5 },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#F59E0B' },
  hot: { backgroundColor: '#EF4444' },
});
