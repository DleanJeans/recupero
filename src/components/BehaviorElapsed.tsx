import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { getCooldownColor } from '../utils/cooldownUtils';
import { formatElapsedNumeric } from '../utils/timeUtils';

interface Props {
  behavior: BehaviorEntry;
}

export function BehaviorElapsed({ behavior }: Props) {
  const color = behavior.cooldownMinutes ? getCooldownColor(behavior) : undefined;

  return <Text style={[styles.elapsed, color ? { color } : null]}>{formatElapsedNumeric(behavior.lastTimestamp)}</Text>;
}

const styles = StyleSheet.create({
  elapsed: {
    color: Colors.text.muted,
    fontSize: 11,
  },
});
