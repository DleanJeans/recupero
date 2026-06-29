import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '../../../components/Text';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getDecayForGap, XP_PER_LOG } from '../../../utils/xpUtils';
import { DistanceIndicator } from './DistanceIndicator';

interface Props {
  earlierMs: number;
  laterMs: number;
  /** When set, renders a red `-N XP` label below the duration showing decay accrued in this gap. */
  xpDecay?: BehaviorEntry['xpDecay'];
  style?: ViewStyle;
}

export function LogGap({ earlierMs, laterMs, xpDecay, style }: Props) {
  const durationMs = Math.max(0, laterMs - earlierMs);
  const decayLabel = useMemo(() => {
    if (!xpDecay) return undefined;
    const lost = getDecayForGap(earlierMs, laterMs, xpDecay);
    return lost > 0 ? `- ${lost * XP_PER_LOG} XP` : undefined;
  }, [earlierMs, laterMs, xpDecay]);

  return (
    <View style={[styles.connector, style]}>
      <View style={styles.line} />
      <View style={{ marginVertical: 3 }}>
        <DistanceIndicator durationMs={durationMs} />
        {decayLabel && <Text style={styles.decayLabel}>{decayLabel}</Text>}
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  connector: {
    alignItems: 'center',
  },
  line: {
    width: 1,
    height: 10,
    backgroundColor: Colors.border.dim,
  },
  decayLabel: {
    color: Colors.cooldown.red,
    fontSize: 10,
    fontWeight: '600',
  },
});
