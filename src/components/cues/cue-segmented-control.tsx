import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { Text } from '../text';

interface CueSegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function CueSegmentedControl<T extends string>({ value, options, onChange }: CueSegmentedControlProps<T>) {
  return (
    <View style={styles.control}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [styles.option, selected && styles.selectedOption, pressed && styles.pressed]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 4,
  },
  option: { flex: 1, alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  selectedOption: { backgroundColor: Colors.bg.elevated },
  label: { color: Colors.text.faint, fontSize: 13, fontWeight: '700' },
  selectedLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.7 },
});
