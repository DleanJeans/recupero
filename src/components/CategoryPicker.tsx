import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Category } from '../types/behavior';
import { Text } from './Text';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | undefined;
  onChange: (id: string | undefined) => void;
}

export function CategoryPicker({ categories, selectedId, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.chip, !selectedId && styles.chipActive, pressed && { opacity: 0.7 }]}
          onPress={() => onChange(undefined)}
        >
          <Text style={[styles.chipText, !selectedId && styles.chipTextActive]}>None</Text>
        </Pressable>
        {categories.map(cat => (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.chip,
              selectedId === cat.id && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onChange(cat.id)}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text style={[styles.chipText, selectedId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  label: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#666',
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
});
