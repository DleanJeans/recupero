import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

interface ModeButtonProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  onPress: () => void;
}

export function ModeButton({ label, icon, active, onPress }: ModeButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? Colors.text.primary : Colors.text.faint}
      />
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: Colors.bg.input,
  },
  modeLabel: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: Colors.text.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
