import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface Props {
  onPress: () => void;
}

export function AddBehaviorButton({ onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={onPress}>
      <Text style={styles.fabText}>+ Add behavior</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    margin: 16,
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabPressed: {
    backgroundColor: '#D8D8D8',
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
  fabText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
});
