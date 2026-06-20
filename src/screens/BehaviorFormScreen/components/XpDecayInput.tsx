import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DurationInput } from '../../../components/DurationInput';
import type { DurationUnit } from '../../../components/DurationInput';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

const DECAY_UNITS: DurationUnit[] = ['days', 'weeks', 'months'];

interface Props {
  enabled: boolean;
  everyMinutes: number;
  unit: DurationUnit;
  onToggle: () => void;
  onChangeMinutes: (minutes: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
}

export function XpDecayInput({ enabled, everyMinutes, unit, onToggle, onChangeMinutes, onUnitChange }: Props) {
  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
        onPress={onToggle}
      >
        <View style={[styles.checkbox, enabled && styles.checkboxChecked]}>
          {enabled && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.toggleLabel}>Decay XP over time</Text>
        <Text style={styles.toggleHint}>Lose 1 log per period without logging</Text>
      </Pressable>
      {enabled && (
        <View style={styles.inputsSection}>
          <Text style={styles.inputsLabel}>Lose 1 log (5 XP) every:</Text>
          <DurationInput
            totalMinutes={everyMinutes}
            onChange={onChangeMinutes}
            units={DECAY_UNITS}
            preferredUnit={unit}
            onUnitChange={onUnitChange}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.text.primary,
    borderColor: Colors.text.primary,
  },
  checkmark: {
    color: Colors.bg.card,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleLabel: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  toggleHint: {
    color: Colors.border.light,
    fontSize: 12,
    marginLeft: 'auto',
  },
  inputsSection: {
    gap: 8,
  },
  inputsLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
