import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { DistanceIndicator } from './DistanceIndicator';

interface Props {
  durationMs: number;
  style?: ViewStyle;
}

export function DistanceConnector({ durationMs, style }: Props) {
  return (
    <View style={[styles.connector, style]}>
      <View style={styles.line} />
      <DistanceIndicator
        durationMs={durationMs}
        style={{ marginVertical: 3 }}
      />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  connector: {
    alignItems: 'center',
  },
  line: {
    width: 1,
    height: 8,
    backgroundColor: Colors.borderDim,
  },
});
