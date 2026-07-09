import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SelectPill } from '../../../components/select-pill';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface CueChipGroupProps<T extends string> {
  label: string;
  options: Array<{ label: string; value: T; icon: IoniconName }>;
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
            >
              <View style={styles.chipContent}>
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={active ? Colors.text.primary : Colors.text.light}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </View>
            </SelectPill>
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
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
