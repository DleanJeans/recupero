import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useNeedsStore } from '../../../store/needs-store';
import { Colors } from '../../../utils/colors';
import {
  SLEEP_QUALITY_MAX_FACTOR,
  SLEEP_QUALITY_MIN_FACTOR,
  SLEEP_RESTORATIVE_TARGET,
} from '../../../utils/need-utils';
import { formatDuration } from '../../../utils/time-utils';

/** Explains, once, how this behaviour's logs score for Energy. Dismissible. */
export function EnergyRuleCard({ fullMinutes }: { fullMinutes: number }) {
  const hidden = useNeedsStore(state => state.energyRuleHidden);
  const setHidden = useNeedsStore(state => state.setEnergyRuleHidden);
  if (hidden) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.text}>
        ⚡ This behaviour refills <Text style={styles.accent}>Energy</Text>: time asleep ÷{' '}
        {formatDuration(fullMinutes * 60_000)}, × a quality of {SLEEP_QUALITY_MIN_FACTOR}–{SLEEP_QUALITY_MAX_FACTOR}{' '}
        from how much was deep + REM ({Math.round(SLEEP_RESTORATIVE_TARGET * 100)}% = ×1.0).
      </Text>
      <Pressable
        onPress={() => setHidden(true)}
        hitSlop={10}
        accessibilityLabel="Hide"
      >
        <Ionicons
          name="close"
          size={16}
          color={Colors.text.faint}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.darker,
  },
  text: {
    flex: 1,
    color: Colors.text.light,
    fontSize: 13,
    lineHeight: 19,
  },
  accent: {
    color: Colors.energy,
    fontWeight: '600',
  },
});
