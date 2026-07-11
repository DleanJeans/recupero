import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { sanitizeDecimalInput } from '../../../utils/metadata-calculation-utils';

interface MetadataDefaultInputProps {
  field: MetadataField;
  value: string;
  label: string;
  unitLabel?: string;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function MetadataDefaultInput({ field, value, label, unitLabel, onChange }: MetadataDefaultInputProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={v => onChange(prev => ({ ...prev, [field.key]: sanitizeDecimalInput(v) }))}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={8}
        />
        {unitLabel ? <Text style={styles.unit}>{unitLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  input: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 14,
    width: 80,
    textAlign: 'right',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unit: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
  },
});
