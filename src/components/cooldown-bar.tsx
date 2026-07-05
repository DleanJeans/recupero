import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { getCooldownColor, isCooldownActive } from '../utils/cooldown-utils';
import { formatCooldown, MS_PER_MINUTE } from '../utils/time-utils';
import { BehaviorElapsed } from './behavior-elapsed';
import { CooldownIcon } from './cooldown-icon';
import { StripedProgressBar } from './striped-progress-bar';

const STRIPE_ANIMATION_MIN_DURATION_MS = 2 * 60 * MS_PER_MINUTE;

interface Props {
  behavior: BehaviorEntry;
  motionEnabled?: boolean;
  now?: number;
}

export function CooldownBar({ behavior, motionEnabled = true, now = Date.now() }: Props) {
  if (!isCooldownActive(behavior) || !behavior.lastTimestamp) {
    return (
      <BehaviorElapsed
        behavior={behavior}
        now={now}
      />
    );
  }

  const color = getCooldownColor(behavior);
  const elapsedMs = now - behavior.lastTimestamp;
  const cooldownMs = behavior.cooldownMinutes * MS_PER_MINUTE;
  const ratio = elapsedMs / cooldownMs;
  const stripeMotionEnabled = motionEnabled && cooldownMs > STRIPE_ANIMATION_MIN_DURATION_MS && ratio < 1;

  return (
    <View style={styles.row}>
      <CooldownIcon
        size={12}
        color={color}
      />
      <StripedProgressBar
        ratio={ratio}
        color={color}
        direction={1}
        motionEnabled={stripeMotionEnabled}
      />
      <BehaviorElapsed
        behavior={behavior}
        now={now}
      />
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
