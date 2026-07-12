import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { STAR_SLOTS, type StarInputs, type StarSlot } from '../../../hooks/use-star-thresholds-form';
import { Colors } from '../../../utils/colors';

interface Props {
  inputs: StarInputs;
  validationError: string | null;
  onInputChange: (slot: StarSlot, value: string) => void;
}

export function StarMoneyMultipliersFormField({ inputs, validationError, onInputChange }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Money multiplier when earning each star</Text>
      <View style={styles.inputsRow}>
        {STAR_SLOTS.map(slot => (
          <View
            key={slot}
            style={styles.inputCell}
          >
            <Text style={styles.inputLabel}>{slot}★</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.multiplierSymbol}>×</Text>
              <TextInput
                style={styles.input}
                value={inputs[slot]}
                onChangeText={value => onInputChange(slot, value)}
                placeholder="1"
                placeholderTextColor={Colors.text.dim}
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={6}
              />
            </View>
          </View>
        ))}
      </View>
      {validationError && <Text style={styles.error}>{validationError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
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
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    gap: 2,
  },
  multiplierSymbol: {
    color: Colors.text.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: Colors.status.dangerLight,
    fontSize: 12,
    fontWeight: '500',
  },
});
