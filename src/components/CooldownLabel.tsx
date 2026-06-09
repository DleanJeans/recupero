import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { getCooldownColor } from '../utils/cooldownUtils';
import { formatCooldown } from '../utils/timeUtils';
import { CooldownIcon } from './CooldownIcon';

interface Props {
  behavior: BehaviorEntry;
}

export function CooldownLabel({ behavior }: Props) {
  if (!behavior.cooldownMinutes) return null;

  const color = getCooldownColor(behavior);

  return (
    <View style={styles.row}>
      <CooldownIcon color={color} />
      <Text style={[styles.text, { color }]}>{formatCooldown(behavior.cooldownMinutes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { fontSize: 13, fontWeight: '500' },
});
