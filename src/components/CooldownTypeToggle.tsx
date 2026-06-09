import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import type { CooldownType } from '../utils/cooldownUtils';
import { TypeOption } from './TypeOption';

interface CooldownTypeToggleProps {
  value: CooldownType;
  onChange: (v: CooldownType) => void;
  style?: ViewStyle;
}
export function CooldownTypeToggle({ value, onChange, style }: CooldownTypeToggleProps) {
  return (
    <View style={[styles.row, style]}>
      <TypeOption
        label="Rest"
        active={value === 'rest'}
        activeBtnStyle={styles.btnRest}
        activeTextStyle={styles.textRest}
        onPress={() => onChange('rest')}
        style={styles.btn}
      />
      <TypeOption
        label="Limit"
        active={value === 'limit'}
        activeBtnStyle={styles.btnLimit}
        activeTextStyle={styles.textLimit}
        onPress={() => onChange('limit')}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 0,
    marginLeft: 'auto',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  btn: {
    paddingHorizontal: 20,
  },
  btnRest: {
    backgroundColor: Colors.typeBtn.rest,
  },
  btnLimit: {
    backgroundColor: Colors.typeBtn.limit,
  },
  textRest: {
    color: Colors.status.successLight,
    fontWeight: '600',
  },
  textLimit: {
    color: Colors.typeText.undesirable,
    fontWeight: '600',
  },
});
