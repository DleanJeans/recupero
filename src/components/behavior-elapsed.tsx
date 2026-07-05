import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { getCooldownColor, isCooldownActive } from '../utils/cooldown-utils';
import { formatElapsedNumeric } from '../utils/time-utils';

interface Props {
  behavior: BehaviorEntry;
  now?: number;
}

export function BehaviorElapsed({ behavior, now }: Props) {
  const color = isCooldownActive(behavior) ? getCooldownColor(behavior) : undefined;

  return (
    <Text style={[styles.elapsed, color ? { color } : null]}>{formatElapsedNumeric(behavior.lastTimestamp, now)}</Text>
  );
}

const styles = StyleSheet.create({
  elapsed: {
    color: Colors.text.muted,
    fontSize: 10,
  },
});
