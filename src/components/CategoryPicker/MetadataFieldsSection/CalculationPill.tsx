import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../../utils/colors';
import { Text } from '../../Text';

interface CalculationPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function CalculationPill({ label, active, onPress }: CalculationPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.calculationPill, active && styles.calculationPillActive]}
    >
      <Text style={[styles.calculationPillText, active && styles.calculationPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  calculationPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  calculationPillActive: {
    backgroundColor: Colors.text.light,
  },
  calculationPillText: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  calculationPillTextActive: {
    color: Colors.bg.primary,
  },
});
