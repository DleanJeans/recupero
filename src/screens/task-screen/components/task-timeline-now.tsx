import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatStartTime, toStartTime } from '../../../utils/task-schedule-utils';

const NOW_COLOR = '#4a9eff';

/** The "Now" node of the Today timeline: finished tasks sit above it, the rest below. */
export function TaskTimelineNow({ now }: { now: Date }) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.line} />
        <View style={styles.dot} />
      </View>
      <Text
        style={styles.label}
        numberOfLines={1}
      >
        {`Now · ${formatStartTime(toStartTime(now))}`}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 28 },
  rail: { width: 16, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: Colors.bg.input },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: NOW_COLOR },
  label: { color: NOW_COLOR, fontSize: 13, fontWeight: '700', flexShrink: 0 },
  rule: { flex: 1, height: 1, backgroundColor: NOW_COLOR, opacity: 0.4 },
});
