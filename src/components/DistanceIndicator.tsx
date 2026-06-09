import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { formatDuration } from '../utils/timeUtils';
import { Text } from './Text';

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
    marginVertical: 2,
  },
  text: {
    color: Colors.textFaint,
    fontSize: 12,
    fontWeight: '500',
  },
});
