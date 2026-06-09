import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorType } from '../types/behavior';
import { Colors } from '../utils/colors';
import { TypeOption } from './TypeOption';

interface TypePickerProps {
  value: BehaviorType;
  onChange: (v: BehaviorType) => void;
}
export function TypePicker({ value, onChange }: TypePickerProps) {
  return (
    <View style={styles.row}>
      {TYPE_OPTIONS.map(opt => (
        <TypeOption
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          activeBtnStyle={opt.activeBtnStyle}
          activeTextStyle={opt.activeTextStyle}
          onPress={() => onChange(opt.value)}
          style={styles.btn}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
  },
  btnUndesirable: {
    backgroundColor: Colors.typeBtnUndesirable,
  },
  btnNeutral: {
    backgroundColor: Colors.typeBtnNeutral,
  },
  btnDesirable: {
    backgroundColor: Colors.typeBtnDesirable,
  },
  textUndesirable: {
    color: Colors.typeTextUndesirable,
    fontWeight: '600',
  },
  textNeutral: {
    color: Colors.typeNeutral,
    fontWeight: '600',
  },
  textDesirable: {
    color: Colors.typeTextDesirable,
    fontWeight: '600',
  },
});

const TYPE_OPTIONS: { value: BehaviorType; label: string; activeBtnStyle: object; activeTextStyle: object }[] = [
  {
    value: 'undesirable',
    label: 'Undesirable',
    activeBtnStyle: styles.btnUndesirable,
    activeTextStyle: styles.textUndesirable,
  },
  { value: 'neutral', label: 'Neutral', activeBtnStyle: styles.btnNeutral, activeTextStyle: styles.textNeutral },
  {
    value: 'desirable',
    label: 'Desirable',
    activeBtnStyle: styles.btnDesirable,
    activeTextStyle: styles.textDesirable,
  },
];
