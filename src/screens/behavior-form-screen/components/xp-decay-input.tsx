import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckboxRow } from '../../../components/checkbox-row';
import type { DurationUnit } from '../../../components/duration-input';
import { DurationInput } from '../../../components/duration-input';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

const DECAY_UNITS: DurationUnit[] = ['hours', 'days', 'weeks', 'months'];

interface Props {
  enabled: boolean;
  everyMinutes: number;
  unit: DurationUnit;
  onToggle: () => void;
  onChangeMinutes: (minutes: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
}

export function XPDecayInput({ enabled, everyMinutes, unit, onToggle, onChangeMinutes, onUnitChange }: Props) {
  return (
    <View style={styles.section}>
      <CheckboxRow
        label="Decay XP over time"
        hint="Lose 1 log per period without logging"
        checked={enabled}
        onToggle={onToggle}
        variant="row"
      />
      {enabled && (
        <View style={styles.inputsSection}>
          <Text style={styles.inputsLabel}>Lose 1 log every:</Text>
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
