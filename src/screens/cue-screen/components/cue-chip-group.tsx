import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SelectPill } from '../../../components/select-pill';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface CueChipGroupProps<T extends string> {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T | null;
  onChange: (value: T) => void;
}

export function CueChipGroup<T extends string>({ label, options, value, onChange }: CueChipGroupProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map(option => {
          const active = option.value === value;
          return (
            <SelectPill
              key={option.value}
              label={option.label}
              active={active}
              onPress={() => onChange(option.value)}
              style={[styles.chip, active && styles.chipActive]}
              textStyle={styles.chipText}
              activeTextStyle={styles.chipTextActive}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.text.light,
  },
  chipText: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.text.primary,
  },
});
