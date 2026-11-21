import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface TidyChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** A rounded choice chip; green when selected. */
export function TidyChip({ label, selected, onPress }: TidyChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: Colors.bg.input, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  selected: { backgroundColor: Colors.typeBtn.desirable },
  pressed: { opacity: 0.7 },
  label: { color: Colors.text.secondary, fontSize: 13 },
  labelSelected: { color: Colors.typeText.desirable, fontWeight: '600' },
});
