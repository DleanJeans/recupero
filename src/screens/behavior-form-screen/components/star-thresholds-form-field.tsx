import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckboxRow } from '../../../components/checkbox-row';
import { Text, TextInput } from '../../../components/text';
import { STAR_SLOTS, type StarInputs, type StarSlot } from '../../../hooks/use-star-thresholds-form';
import type { StarPeriod } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { StarPeriodPicker } from './star-period-picker';

const SLOT_PLACEHOLDERS: Record<StarSlot, string> = {
  '1': '1',
  '2': '3',
  '3': '5',
};

interface Props {
  enabled: boolean;
  period: StarPeriod;
  inputs: StarInputs;
  validationError: string | null;
  onToggle: () => void;
  onInputChange: (slot: StarSlot, value: string) => void;
  onPeriodChange: (period: StarPeriod) => void;
}

export function StarThresholdsFormField({
  enabled,
  period,
  inputs,
  validationError,
  onToggle,
  onInputChange,
  onPeriodChange,
}: Props) {
  return (
    <CheckboxRow
      label="Track stars"
      hint="Show a 1-3 star rating on Home and Day view"
      checked={enabled}
      onToggle={onToggle}
    >
      {enabled && (
        <View style={styles.inputsSection}>
          <StarPeriodPicker
            value={period}
            onChange={onPeriodChange}
          />
          <Text style={styles.inputsLabel}>Logs per star (leave a tier blank to skip it):</Text>
          <View style={styles.inputsRow}>
            {STAR_SLOTS.map(slot => (
              <View
                key={slot}
                style={styles.inputCell}
              >
                <Text style={styles.inputLabel}>{slot}★</Text>
                <TextInput
                  style={styles.input}
                  value={inputs[slot]}
                  onChangeText={v => onInputChange(slot, v)}
                  placeholder={SLOT_PLACEHOLDERS[slot]}
                  placeholderTextColor={Colors.text.dim}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={5}
                />
              </View>
            ))}
          </View>
          {validationError && <Text style={styles.error}>{validationError}</Text>}
        </View>
      )}
    </CheckboxRow>
  );
}

const styles = StyleSheet.create({
  inputsSection: {
    gap: 12,
  },
  inputsLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputCell: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  inputLabel: {
    color: Colors.star.filled,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  error: {
    color: Colors.status.dangerLight,
    fontSize: 12,
    fontWeight: '500',
  },
});
