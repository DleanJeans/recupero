import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../../utils/colors';

const SIZE = 48;

interface SearchFabProps {
  active: boolean;
  onPress: () => void;
}

/** Round floating Search button, bottom-left; turns into a close button while searching. */
export function SearchFab({ active, onPress }: SearchFabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Close search' : 'Search'}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Ionicons
        name={active ? 'close' : 'search'}
        size={22}
        color={Colors.text.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 0,
    bottom: 12,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
