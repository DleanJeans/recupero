import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { getCooldownColor, isCooldownActive } from '../utils/cooldownUtils';
import { formatCooldown, MS_PER_MINUTE } from '../utils/timeUtils';
import { BehaviorElapsed } from './BehaviorElapsed';
import { StripedProgressBar } from './StripedProgressBar';

interface Props {
  behavior: BehaviorEntry;
}

export function CooldownBar({ behavior }: Props) {
  if (!isCooldownActive(behavior) || !behavior.lastTimestamp) {
    return <BehaviorElapsed behavior={behavior} />;
  }

  const color = getCooldownColor(behavior);
  const elapsedMs = Date.now() - behavior.lastTimestamp;
  const cooldownMs = behavior.cooldownMinutes * MS_PER_MINUTE;
  const ratio = elapsedMs / cooldownMs;

  return (
    <View style={styles.row}>
      <Ionicons
        name="timer-outline"
        size={12}
        color={color}
      />
      <StripedProgressBar
        ratio={ratio}
        color={color}
        direction={1}
      />
      <BehaviorElapsed behavior={behavior} />
      <Text style={styles.cooldownHint}>{` / ${formatCooldown(behavior.cooldownMinutes)}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cooldownHint: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '500',
  },
});
