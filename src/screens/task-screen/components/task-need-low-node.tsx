import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { NEED_INFO } from '../../../utils/need-utils';
import { formatStartTime, toStartTime } from '../../../utils/task-schedule-utils';

interface TaskNeedLowNodeProps {
  needId: NeedId;
  /** When the need is forecast to reach its craving line. */
  ts: number;
}

/** Timeline marker for a need that will enter its low zone at this time if nothing refills it. */
export function TaskNeedLowNode({ needId, ts }: TaskNeedLowNodeProps) {
  const info = NEED_INFO[needId];
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <Text
        style={styles.text}
        numberOfLines={1}
      >
        {`${info.label} gets low`}
      </Text>
      <Text
        style={styles.time}
        numberOfLines={1}
      >
        {formatStartTime(toStartTime(new Date(ts)))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32 },
  emoji: { fontSize: 16 },
  text: { flex: 1, color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  time: { color: Colors.text.faint, fontSize: 12, fontWeight: '700', flexShrink: 0, minWidth: 64, textAlign: 'right' },
});
