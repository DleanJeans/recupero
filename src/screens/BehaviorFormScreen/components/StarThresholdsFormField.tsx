import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/Text';
import type { StarInputs, StarSlot } from '../../../hooks/useStarThresholdsForm';
import { Colors } from '../../../utils/colors';

interface Props {
  enabled: boolean;
  inputs: StarInputs;
  validationError: string | null;
  onToggle: () => void;
  onInputChange: (slot: StarSlot, value: string) => void;
}

export function StarThresholdsFormField({ enabled, inputs, validationError, onToggle, onInputChange }: Props) {
  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
        onPress={onToggle}
      >
        <View style={[styles.checkbox, enabled && styles.checkboxChecked]}>
          {enabled && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.toggleLabel}>Track daily stars</Text>
        <Text style={styles.toggleHint}>Show a 3-star rating on Home and Day</Text>
      </Pressable>
      {enabled && (
        <View style={styles.inputsSection}>
          <Text style={styles.inputsLabel}>Earn 1★, 2★, 3★ at this many daily logs:</Text>
          <View style={styles.inputsRow}>
            {(['1', '2', '3'] as const).map(slot => (
              <View
                key={slot}
                style={styles.inputCell}
              >
                <Text style={styles.inputLabel}>{slot}★</Text>
                <TextInput
                  style={styles.input}
                  value={inputs[slot]}
                  onChangeText={v => onInputChange(slot, v)}
                  placeholder={slot === '1' ? '1' : slot === '2' ? '3' : '5'}
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
    backgroundColor: Colors.bg.input,
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
