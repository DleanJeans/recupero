import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';

interface TaskCheckboxProps {
  checked: boolean;
}

/** Rounded-square tick box, the same look as the Routines checklist rows. */
export function TaskCheckbox({ checked }: TaskCheckboxProps) {
  return (
    <View style={[styles.box, checked && styles.boxDone]}>
      {checked && (
        <Ionicons
          name="checkmark"
          size={18}
          color={Colors.bg.black}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: {
    backgroundColor: Colors.type.desirable,
    borderColor: Colors.type.desirable,
  },
});
