import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { Text, TextInput } from './Text';

interface CategoryBarProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function CategoryBar({ selectedCategoryId, onSelectCategory }: CategoryBarProps) {
  const { categories, addCategory } = useBehaviorStore();
  const [showForm, setShowForm] = useState(false);
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji || !trimmedName) return;
    addCategory(trimmedName, trimmedEmoji);
    setEmoji('');
    setName('');
    setShowForm(false);
  };

  const handleCancel = () => {
    setEmoji('');
    setName('');
    setShowForm(false);
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
          <Text
            style={[
              styles.chipText,
              selectedCategoryId === null && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>

        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.chip,
              selectedCategoryId === cat.id && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onSelectCategory(cat.id)}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.chipText,
                selectedCategoryId === cat.id && styles.chipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addChip, pressed && { opacity: 0.7 }]}
          onPress={() => setShowForm((v) => !v)}
        >
          <Text style={styles.addChipText}>{showForm ? '✕' : '+'}</Text>
        </Pressable>
      </ScrollView>

      {showForm && (
        <View style={styles.form}>
          <View style={styles.formRow}>
            <TextInput
              style={styles.emojiInput}
              placeholder="🏃"
              placeholderTextColor="#4a4a4a"
              value={emoji}
              onChangeText={setEmoji}
              maxLength={2}
              autoFocus
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Category name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
          </View>
          <View style={styles.formActions}>
            <Pressable
              style={({ pressed }) => [styles.formCancelBtn, pressed && { opacity: 0.7 }]}
              onPress={handleCancel}
            >
              <Text style={styles.formCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.formAddBtn,
                pressed && { opacity: 0.7 },
                (!emoji.trim() || !name.trim()) && styles.formAddBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!emoji.trim() || !name.trim()}
            >
              <Text
                style={[
                  styles.formAddText,
                  (!emoji.trim() || !name.trim()) && styles.formAddTextDisabled,
                ]}
              >
                Add
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
  emojiInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 20,
    width: 48,
    textAlign: 'center',
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
