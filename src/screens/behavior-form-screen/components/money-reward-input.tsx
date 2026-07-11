import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface MoneyRewardInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function MoneyRewardInput({ label, value, onChangeText }: MoneyRewardInputProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={10}
        />
        <Text style={styles.unit}>₫</Text>
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
  label: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    width: 100,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    color: Colors.text.primary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'right',
  },
  unit: {
    width: 16,
    color: Colors.text.faint,
    fontSize: 14,
    fontWeight: '700',
  },
});
