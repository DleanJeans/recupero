import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { getCooldownColor } from '../utils/cooldownUtils';
import { MS_PER_MINUTE } from '../utils/timeUtils';
import { BehaviorElapsed } from './BehaviorElapsed';
import { StripedProgressBar } from './StripedProgressBar';

interface Props {
  behavior: BehaviorEntry;
}

export function CooldownBar({ behavior }: Props) {
  if (!behavior.cooldownMinutes || !behavior.lastTimestamp) {
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
});
