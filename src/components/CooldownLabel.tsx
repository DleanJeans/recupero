import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CooldownIcon } from './CooldownIcon';
import { formatCooldown } from '../utils/timeUtils';

interface Props {
  minutes: number;
}

export function CooldownLabel({ minutes }: Props) {
  return (
    <View style={styles.row}>
      <CooldownIcon />
      <Text style={styles.text}>{formatCooldown(minutes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
});
