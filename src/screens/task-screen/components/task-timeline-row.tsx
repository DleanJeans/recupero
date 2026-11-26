import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';

interface TaskTimelineRowProps {
  /** Dot colour; defaults to the muted rail colour. */
  dotColor?: string;
  /** Filled dot (done task). */
  filled?: boolean;
  first?: boolean;
  last?: boolean;
  children: ReactNode;
}

/** A row of the Today timeline: a vertical rail with a dot on the left, the content on the right. */
export function TaskTimelineRow({ dotColor = Colors.text.faint, filled, first, last, children }: TaskTimelineRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.line, first && styles.lineFirst, last && styles.lineLast]} />
        <View style={[styles.dot, { borderColor: dotColor }, filled && { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  rail: { width: 16, alignItems: 'center' },
  line: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: Colors.bg.input },
  lineFirst: { top: 20 },
  lineLast: { bottom: '60%' },
  dot: {
    position: 'absolute',
    top: 17,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: Colors.bg.card,
  },
  content: { flex: 1 },
});
