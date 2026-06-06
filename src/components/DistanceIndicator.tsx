import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDuration } from '../utils/timeUtils';
import { Text } from './Text';

interface Props {
  durationMs: number;
}

export function DistanceIndicator({ durationMs }: Props) {
  return (
    <View style={styles.row}>
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
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
});
