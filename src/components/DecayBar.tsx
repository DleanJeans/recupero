import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorEntry, BehaviorType } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behaviorTypeUtils';
import { Colors } from '../utils/colors';
import { formatDuration, MS_PER_DAY } from '../utils/timeUtils';
import { getTimeUntilNextDecay } from '../utils/xpUtils';
import { StripedProgressBar } from './StripedProgressBar';
import { Text } from './Text';

interface Props {
  behavior: BehaviorEntry;
}

/** Decay color reflects whether decay is "good" or "bad" for the behavior type:
 *  red for desirable (decay hurts progress), green for undesirable (decay helps),
 *  neutral type color for neutral behaviors. */
const DECAY_COLOR: Record<BehaviorType, string> = {
  desirable: Colors.cooldown.red,
  undesirable: Colors.cooldown.green,
  neutral: getBehaviorTypeColor('neutral'),
};

export function DecayBar({ behavior }: Props) {
  const decay = getTimeUntilNextDecay(behavior);
  if (!decay) return null;
  const { daysLeft, everyDays } = decay;
  const isUndesirable = behavior.type === 'undesirable';
  // For desirable/neutral: bar empties as we approach decay (time remaining).
  // For undesirable: decay is a reward, so invert — bar fills as we approach it.
  const ratio = isUndesirable ? 1 - daysLeft / everyDays : daysLeft / everyDays;
  const color = DECAY_COLOR[behavior.type ?? 'neutral'];

  return (
    <View style={styles.row}>
      <Ionicons
        name="hourglass-outline"
        size={12}
        color={color}
      />
      <StripedProgressBar
        ratio={ratio}
        color={color}
        direction={isUndesirable ? 1 : -1}
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
  label: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
  },
});
