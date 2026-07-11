import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface MoneyRewardInputProps {
  value: string;
  rateLabel: string;
  negative?: boolean;
  onChangeText: (value: string) => void;
}

export function MoneyRewardInput({ value, rateLabel, negative = false, onChangeText }: MoneyRewardInputProps) {
  return (
    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, negative ? styles.inputNegative : styles.inputPositive]}
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={10}
        />
        <Text style={[styles.unit, negative ? styles.unitNegative : styles.unitPositive]}>₫ {rateLabel}</Text>
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
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    width: 100,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'right',
  },
  unit: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputPositive: {
    color: Colors.type.desirable,
  },
  inputNegative: {
    color: Colors.type.undesirable,
  },
  unitPositive: {
    color: Colors.type.desirable,
  },
  unitNegative: {
    color: Colors.type.undesirable,
  },
});
