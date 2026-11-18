import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface CheckInChipRowProps {
  options: ReadonlyArray<{ value: number; label: string }>;
  isSelected: (value: number) => boolean;
  onPress: (value: number) => void;
}

/** A wrapping row of selectable chips. */
export function CheckInChipRow({ options, isSelected, onPress }: CheckInChipRowProps) {
  return (
    <View style={styles.row}>
      {options.map(option => {
        const selected = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
            onPress={() => onPress(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.bg.input,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  selected: { backgroundColor: `${Colors.cue.mood}22`, borderColor: Colors.cue.mood },
  pressed: { opacity: 0.7 },
  label: { color: Colors.text.muted, fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: Colors.text.primary },
});
