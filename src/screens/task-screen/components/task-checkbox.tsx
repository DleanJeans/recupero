import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../../utils/colors';

interface TaskCheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string;
}

/** Rounded-square tick box, the same look as the Routines checklist rows. Only this box ticks the task. */
export function TaskCheckbox({ checked, onPress, label }: TaskCheckboxProps) {
  return (
    <Pressable
      style={[styles.box, checked && styles.boxDone]}
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="checkbox"
      accessibilityLabel={checked ? `Untick ${label}` : `Tick ${label}`}
      accessibilityState={{ checked }}
    >
      {checked && (
        <Ionicons
          name="checkmark"
          size={18}
          color={Colors.bg.black}
        />
      )}
    </Pressable>
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
