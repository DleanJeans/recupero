import { Ionicons } from '@expo/vector-icons';
import React, { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface CheckboxRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  style?: ViewStyle;
}

export function CheckboxRow({ label, hint, checked, onToggle, style }: CheckboxRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }, style]}
      onPress={onToggle}
    >
      <Ionicons
        name={(checked ? 'checkbox' : 'checkbox-outline') as IconName}
        size={22}
        color={checked ? Colors.text.primary : Colors.border.light}
      />
      <View style={styles.labelStack}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  labelStack: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    color: Colors.border.light,
    fontSize: 12,
  },
});
