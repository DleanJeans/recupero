import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getDecayedLogs, getLogXp } from '../../../utils/xp-utils';

interface Props {
  behavior: BehaviorEntry;
  now: number;
}

export function DecayedXPSummary({ behavior, now }: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const { count, xp } = useMemo(() => {
    const decayedLogs = getDecayedLogs(behavior, now, dayCutoffHour);
    return {
      count: decayedLogs.length,
      xp: decayedLogs.reduce((total, log) => total + getLogXp(log), 0),
    };
  }, [behavior, dayCutoffHour, now]);

  if (count === 0) return null;

  return (
    <View style={styles.summary}>
      <Text style={styles.label}>Decayed</Text>
      <Text style={styles.value}>
        -{xp} XP · {count} {count === 1 ? 'log' : 'logs'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomColor: Colors.border.default,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    color: Colors.status.dangerLight,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: Colors.status.dangerLight,
    fontSize: 11,
    marginTop: 2,
  },
});
