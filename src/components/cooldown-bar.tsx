import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { getCooldownColor, isCooldownActive } from '../utils/cooldown-utils';
import { Label } from '../utils/strings';
import { formatCooldown, formatDuration, MS_PER_MINUTE } from '../utils/time-utils';
import { BehaviorElapsed } from './behavior-elapsed';
import { CooldownIcon } from './cooldown-icon';
import { StripedProgressBar } from './striped-progress-bar';

const STRIPE_ANIMATION_MIN_DURATION_MS = 2 * 60 * MS_PER_MINUTE;

interface Props {
  behavior: BehaviorEntry;
  motionEnabled?: boolean;
  now?: number;
  variant?: 'bar' | 'pill';
}

export function CooldownBar({ behavior, motionEnabled = true, now = Date.now(), variant = 'bar' }: Props) {
  if (!isCooldownActive(behavior) || !behavior.lastTimestamp) {
    if (variant === 'pill') return null;
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

  if (variant === 'pill') {
    const remainingMs = Math.max(0, cooldownMs - elapsedMs);
    const roundedRemainingMs = Math.ceil(remainingMs / MS_PER_MINUTE) * MS_PER_MINUTE;
    const remainingLabel = formatDuration(roundedRemainingMs);

    return (
      <View style={[styles.pill, { backgroundColor: `${color}24` }]}>
        <CooldownIcon
          size={14}
          color={color}
        />
        <Text style={[styles.pillLabel, { color }]}>
          {remainingLabel === Label.JUST_NOW ? 'Ready' : `${remainingLabel} left`}
        </Text>
      </View>
    );
  }

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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  cooldownHint: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '500',
  },
});
