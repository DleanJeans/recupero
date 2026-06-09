import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Category } from '../types/behavior';
import { Button } from './Button';
import { Text } from './Text';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | undefined;
  onChange: (id: string | undefined) => void;
}

function allItems(categories: Category[]): (Category | { id: undefined; emoji: string; name: string })[] {
  return [{ id: undefined, emoji: '', name: 'None ' }, ...categories];
}

export function CategoryPicker({ categories, selectedId, onChange }: CategoryPickerProps) {
  const items = allItems(categories);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>
        {items.length === 1 && <Text style={styles.emptyHint}>Tap + to create one on the home screen</Text>}
        {items.map(item => {
          const active = selectedId === item.id;
          return (
            <Button
              key={item.id ?? 'none'}
              variant="ghost"
              size="sm"
              active={active}
              onPress={() => onChange(item.id)}
              style={styles.chip}
            >
              <Text style={styles.chipEmoji}>{item.emoji ?? ''}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  label: { color: '#888', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  chipEmoji: { fontSize: 16 },
  chipText: { color: '#666', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  emptyHint: { color: '#555', fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
});
