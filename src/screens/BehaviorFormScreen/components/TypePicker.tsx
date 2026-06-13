import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TypeOption } from '../../../components/TypeOption';
import type { BehaviorType } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

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
    borderColor: Colors.border.default,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
  },
  btnUndesirable: {
    backgroundColor: Colors.typeBtn.undesirable,
  },
  btnNeutral: {
    backgroundColor: Colors.typeBtn.neutral,
  },
  btnDesirable: {
    backgroundColor: Colors.typeBtn.desirable,
  },
  textUndesirable: {
    color: Colors.typeText.undesirable,
    fontWeight: '600',
  },
  textNeutral: {
    color: Colors.type.neutral,
    fontWeight: '600',
  },
  textDesirable: {
    color: Colors.typeText.desirable,
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
