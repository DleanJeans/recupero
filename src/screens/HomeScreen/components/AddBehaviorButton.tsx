import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

interface Props {
  onPress: () => void;
}

export function AddBehaviorButton({ onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={onPress}
    >
      <Text style={styles.fabText}>+ Add behavior</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    margin: 16,
    backgroundColor: Colors.text.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabPressed: {
    backgroundColor: Colors.text.lightest,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
  fabText: {
    color: Colors.bg.dark,
    fontSize: 15,
    fontWeight: '600',
  },
});
