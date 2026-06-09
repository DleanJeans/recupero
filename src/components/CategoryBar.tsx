import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import type { Category } from '../types/behavior';
import { Button } from './Button';
import { CategoryForm } from './CategoryForm';
import { Text } from './Text';

interface CategoryBarProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function CategoryBar({ selectedCategoryId, onSelectCategory }: CategoryBarProps) {
  const { categories, addCategory, removeCategory, updateCategory } = useBehaviorStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');

  const isEditing = editingCategory != null;

  useEffect(() => {
    if (!editingCategory) return;
    setEmoji(editingCategory.emoji);
    setName(editingCategory.name);
  }, [editingCategory]);

  const resetForm = () => {
    setEmoji('');
    setName('');
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji || !trimmedName) return;
    if (isEditing && editingCategory) {
      updateCategory(editingCategory.id, { name: trimmedName, emoji: trimmedEmoji });
    } else {
      addCategory(trimmedName, trimmedEmoji);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (!editingCategory) return;
    const cat = editingCategory;
    resetForm();
    Alert.alert(`Delete "${cat.name}"?`, `Behaviors in this category will lose their category assignment.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCategory(cat.id) },
    ]);
  };

  const openAddForm = () => {
    setEditingCategory(null);
    setShowForm(v => !v);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Button
          variant="ghost"
          size="sm"
          active={selectedCategoryId === null}
          onPress={() => onSelectCategory(null)}
          style={styles.chip}
        >
          All
        </Button>

        {categories.map(cat => (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            active={selectedCategoryId === cat.id}
            onPress={() => onSelectCategory(cat.id)}
            onLongPress={() => setEditingCategory(cat)}
            style={styles.chip}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onPress={openAddForm}
          style={styles.addChip}
          accessibilityLabel={showForm || editingCategory ? 'Close form' : 'Add category'}
        >
          <Text style={styles.addChipText}>{showForm || editingCategory ? '✕' : '+'}</Text>
        </Button>
      </ScrollView>

      {(showForm || editingCategory) && (
        <CategoryForm
          emoji={emoji}
          name={name}
          isEditing={isEditing}
          onEmojiChange={setEmoji}
          onNameChange={setName}
          onSave={handleSave}
          onCancel={resetForm}
          onDelete={handleDelete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#333',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  addChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addChipText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
});
