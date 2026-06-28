import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TaskStarValue } from '../../../types/task';
import { Colors } from '../../../utils/colors';

interface StarPickerProps {
  value: TaskStarValue;
  onChange: (value: TaskStarValue) => void;
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <View
      style={styles.starPicker}
      accessibilityLabel={`${value} stars`}
    >
      {([1, 2, 3] as TaskStarValue[]).map(starValue => {
        const active = starValue <= value;
        return (
          <Pressable
            key={starValue}
            style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} stars`}
          >
            <Ionicons
              name={active ? 'star' : 'star-outline'}
              size={22}
              color={active ? Colors.star.filled : Colors.star.empty}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  starPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  starButton: {
    padding: 3,
  },
  pressed: {
    opacity: 0.72,
  },
});
