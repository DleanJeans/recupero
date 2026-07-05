import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatDuration } from '../../../utils/time-utils';

interface Props {
  durationMs: number;
  style?: ViewStyle;
}

export function DistanceIndicator({ durationMs, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.text}>{formatDuration(durationMs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
  },
  text: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '500',
  },
});
