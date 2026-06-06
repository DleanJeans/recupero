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

  const minutes = behavior.cooldownMinutes;
  const color = getCooldownColor(minutes, behavior.lastTimestamp, behavior.cooldownType);

  return (
    <View style={styles.row}>
      <CooldownIcon color={color} />
      <Text
        style={[
          styles.text,
          {
            color,
          },
        ]}
      >
        {formatCooldown(minutes)}
      </Text>
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
    fontSize: 13,
    fontWeight: '500',
  },
});
