import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { sanitizeDecimalInput } from '../../../utils/metadata-calculation-utils';

interface MetadataInputRowProps {
  field: MetadataField;
  value: string;
  label: string;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onFocus: () => void;
  onBlur: () => void;
}

export function MetadataInputRow({ field, value, label, onChange, onFocus, onBlur }: MetadataInputRowProps) {
  return (
    <View
      key={field.key}
      style={styles.metadataFieldRow}
    >
      <Text style={styles.metadataFieldLabel}>{label}</Text>
      <TextInput
        style={styles.metadataInput}
        value={value}
        onChangeText={v => onChange(prev => ({ ...prev, [field.key]: sanitizeDecimalInput(v) }))}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="0"
        placeholderTextColor={Colors.text.dim}
        keyboardType="decimal-pad"
        returnKeyType="done"
        maxLength={8}
      />
    </View>
  );
}

export const metadataInputRowStyles = StyleSheet.create({
  metadataFieldRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  metadataFieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  ...metadataInputRowStyles,
  metadataInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
});
