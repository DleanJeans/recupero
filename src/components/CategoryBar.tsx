import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import type { Category } from '../types/behavior';
import { EmojiPicker } from './EmojiPicker';
import { Text, TextInput } from './Text';

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
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeCategory(cat.id),
      },
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
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            selectedCategoryId === null && styles.chipActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Text style={[styles.chipText, selectedCategoryId === null && styles.chipTextActive]}>All</Text>
        </Pressable>

        {categories.map(cat => (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.chip,
              selectedCategoryId === cat.id && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onSelectCategory(cat.id)}
            onLongPress={() => setEditingCategory(cat)}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addChip, pressed && { opacity: 0.7 }]}
          onPress={openAddForm}
        >
          <Text style={styles.addChipText}>{showForm || editingCategory ? '✕' : '+'}</Text>
        </Pressable>
      </ScrollView>

      {(showForm || editingCategory) && (
        <View style={styles.form}>
          <View style={styles.formRow}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Category name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
          </View>
          <View style={styles.formActions}>
            {isEditing && (
              <Pressable
                style={({ pressed }) => [styles.formDeleteBtn, pressed && { opacity: 0.7 }]}
                onPress={handleDelete}
              >
                <Text style={styles.formDeleteText}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.formCancelBtn, pressed && { opacity: 0.7 }]}
              onPress={resetForm}
            >
              <Text style={styles.formCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.formAddBtn,
                pressed && { opacity: 0.7 },
                (!emoji.trim() || !name.trim()) && styles.formAddBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!emoji.trim() || !name.trim()}
            >
              <Text style={[styles.formAddText, (!emoji.trim() || !name.trim()) && styles.formAddTextDisabled]}>
                {isEditing ? 'Save' : 'Add'}
              </Text>
            </Pressable>
          </View>
        </View>
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
  form: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formDeleteBtn: {
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  formDeleteText: {
    color: '#EF9A9A',
    fontSize: 14,
    fontWeight: '600',
  },
  formCancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  formCancelText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  formAddBtn: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  formAddBtnDisabled: {
    backgroundColor: '#2a2a2a',
  },
  formAddText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
  formAddTextDisabled: {
    color: '#555',
  },
});
