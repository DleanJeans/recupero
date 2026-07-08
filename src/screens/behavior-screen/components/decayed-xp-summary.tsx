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
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.status.error,
  },
  label: {
    color: Colors.status.dangerLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: Colors.status.dangerLight,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
