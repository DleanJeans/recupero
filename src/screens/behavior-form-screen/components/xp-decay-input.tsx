import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckboxRow } from '../../../components/checkbox-row';
import type { DurationUnit } from '../../../components/duration-input';
import { Text, TextInput } from '../../../components/text';
import { UnitDropdown } from '../../../components/unit-dropdown';
import { Colors } from '../../../utils/colors';

const DECAY_UNITS: DurationUnit[] = ['hours', 'days', 'weeks', 'months'];

interface Props {
  enabled: boolean;
  every: number;
  unit: DurationUnit;
  onToggle: () => void;
  onChangeEvery: (every: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
}

export function XPDecayInput({ enabled, every, unit, onToggle, onChangeEvery, onUnitChange }: Props) {
  return (
    <View>
      <CheckboxRow
        label="Decay XP over time"
        hint={unit === 'hours' ? 'Lose 1 log after elapsed time' : 'Lose 1 log when a period misses the target'}
        checked={enabled}
        onToggle={onToggle}
        variant="row"
      />
      {enabled && (
        <View style={styles.inputsSection}>
          <Text style={styles.inputsLabel}>{unit === 'hours' ? 'Lose 1 log every:' : 'Decay if under:'}</Text>
          <View style={styles.inputRow}>
            <View style={styles.numberInputWrap}>
              <TextInput
                style={[styles.numberInput, unit !== 'hours' && styles.numberInputWithSuffix]}
                keyboardType="numeric"
                value={every === 0 ? '' : String(every)}
                onChangeText={text => {
                  const num = Number(text);
                  if (!Number.isNaN(num) && num >= 0) onChangeEvery(num);
                }}
                placeholder="0"
                placeholderTextColor={Colors.text.faint}
                selectTextOnFocus
              />
              {unit !== 'hours' && (
                <View
                  pointerEvents="none"
                  style={styles.inputSuffixWrap}
                >
                  <Text style={styles.inputSuffix}>times per</Text>
                </View>
              )}
            </View>
            <UnitDropdown
              value={unit}
              options={DECAY_UNITS}
              onChange={onUnitChange}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputsSection: {
    gap: 8,
  },
  inputsLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  numberInputWrap: {
    flex: 1,
    position: 'relative',
  },
  numberInput: {
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  numberInputWithSuffix: {
    paddingRight: 82,
  },
  inputSuffixWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  inputSuffix: {
    color: Colors.text.muted,
    fontSize: 14,
  },
});
