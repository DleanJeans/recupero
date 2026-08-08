import React from 'react';
import { StyleSheet } from 'react-native';
import { Colors } from '../../../utils/colors';
import { SelectPill } from '../../select-pill';

interface CalculationPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: number;
}

export function CalculationPill({ label, active, onPress, flex = 1 }: CalculationPillProps) {
  return (
    <SelectPill
      label={label}
      active={active}
      activeBtnStyle={styles.calculationPillActive}
      textStyle={styles.calculationPillText}
      activeTextStyle={styles.calculationPillTextActive}
      onPress={onPress}
      style={[styles.calculationPill, { flex }]}
    />
  );
}

const styles = StyleSheet.create({
  calculationPill: {
    minHeight: 34,
    borderRadius: 9,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  calculationPillActive: {
    backgroundColor: Colors.text.light,
  },
  calculationPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  calculationPillTextActive: {
    color: Colors.bg.primary,
  },
});
