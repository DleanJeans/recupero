import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatVndAmount, parseVndInput } from '../../../utils/money-utils';

interface MoneyRewardInputProps {
  value: string;
  rateLabel: string;
  negative?: boolean;
  onChangeText: (value: string) => void;
}

export function MoneyRewardInput({ value, rateLabel, negative = false, onChangeText }: MoneyRewardInputProps) {
  const displayedValue = value ? formatVndAmount(parseVndInput(value)) : '';

  return (
    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, negative ? styles.inputNegative : styles.inputPositive]}
          value={displayedValue}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={Colors.text.dim}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={13}
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
    width: '100%',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
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
