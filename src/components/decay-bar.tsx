import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorEntry, BehaviorType } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behavior-type-utils';
import { Colors } from '../utils/colors';
import { formatDuration, MS_PER_DAY, MS_PER_MINUTE } from '../utils/time-utils';
import { getTimeUntilNextDecay } from '../utils/xp-utils';
import { StripedProgressBar } from './striped-progress-bar';
import { Text } from './text';

interface Props {
  behavior: BehaviorEntry;
  motionEnabled?: boolean;
  now?: number;
  variant?: 'bar' | 'pill';
}

/** Decay color reflects whether decay is "good" or "bad" for the behavior type:
 *  red for desirable (decay hurts progress), green for undesirable (decay helps),
 *  neutral type color for neutral behaviors. */
const DECAY_COLOR: Record<BehaviorType, string> = {
  desirable: Colors.cooldown.red,
  undesirable: Colors.cooldown.green,
  neutral: getBehaviorTypeColor('neutral'),
};
const STRIPE_ANIMATION_MIN_DURATION_MS = 2 * 60 * MS_PER_MINUTE;

export function DecayBar({ behavior, motionEnabled = true, now = Date.now(), variant = 'bar' }: Props) {
  const decay = getTimeUntilNextDecay(behavior, now);
  if (!decay) return null;
  const { daysLeft, everyDays } = decay;
  const isUndesirable = behavior.type === 'undesirable';
  // For desirable/neutral: bar empties as we approach decay (time remaining).
  // For undesirable: decay is a reward, so invert — bar fills as we approach it.
  const ratio = isUndesirable ? 1 - daysLeft / everyDays : daysLeft / everyDays;
  const color = DECAY_COLOR[behavior.type ?? 'neutral'];
  const timeUntilNextDecayMs = daysLeft * MS_PER_DAY;
  const stripeMotionEnabled = motionEnabled && timeUntilNextDecayMs > STRIPE_ANIMATION_MIN_DURATION_MS;

  if (variant === 'pill') {
    return (
      <View style={[styles.pill, { backgroundColor: `${color}24` }]}>
        <Ionicons
          name="trending-down"
          size={14}
          color={color}
        />
        <Text style={[styles.pillLabel, { color }]}>{formatDuration(daysLeft * MS_PER_DAY)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Ionicons
        name="trending-down"
        size={12}
        color={color}
      />
      <StripedProgressBar
        ratio={ratio}
        color={color}
        direction={isUndesirable ? 1 : -1}
        motionEnabled={stripeMotionEnabled}
      />
      <Text style={[styles.label, { color }]}>{formatDuration(daysLeft * MS_PER_DAY)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
  label: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
  },
});
