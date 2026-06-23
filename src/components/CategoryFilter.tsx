import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import type { Category, MetadataField } from '../types/behavior';
import { CategoryPicker } from './CategoryPicker';
import { ToggleNamesButton } from './CategoryPicker/ToggleNamesButton';

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

function toCategoryId(id: string | undefined | null): string | null {
  return id ?? null;
}

export function CategoryFilter({ selectedCategoryId, onSelectCategory }: CategoryFilterProps) {
  const { categories, behaviors, addCategory, removeCategory, updateCategory } = useBehaviorStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [hideNames, setHideNames] = useState(false);

  const isEditing = editingCategory != null;

  useEffect(() => {
    if (!editingCategory) return;
    setEmoji(editingCategory.emoji);
    setName(editingCategory.name);
    setMetadataFields(editingCategory.metadataFields ?? []);
  }, [editingCategory]);

  const resetForm = () => {
    setEmoji('');
    setName('');
    setMetadataFields([]);
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji || !trimmedName) return;
    const mf = metadataFields.length > 0 ? metadataFields : undefined;
    if (isEditing && editingCategory) {
      updateCategory(editingCategory.id, { name: trimmedName, emoji: trimmedEmoji, metadataFields: mf });
    } else {
      addCategory(trimmedName, trimmedEmoji, mf);
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

  const handleLongPress = (category: Category) => {
    setEditingCategory(category);
  };

  const toggleForm = () => {
    setEditingCategory(null);
    setShowForm(v => !v);
  };

  return (
    <View style={styles.container}>
      <CategoryPicker
        categories={categories}
        selectedId={selectedCategoryId}
        onChange={id => onSelectCategory(toCategoryId(id))}
        horizontal
        showAll
        behaviors={behaviors}
        onLongPress={handleLongPress}
        isFormOpen={showForm || editingCategory != null}
        onToggleForm={toggleForm}
        form={{
          emoji,
          name,
          isEditing,
          onEmojiChange: setEmoji,
          onNameChange: setName,
          metadataFields,
          onMetadataFieldsChange: setMetadataFields,
          onSave: handleSave,
          onCancel: resetForm,
          onDelete: handleDelete,
        }}
        hideNames={hideNames}
        leadingAccessory={
          <ToggleNamesButton
            hideNames={hideNames}
            onToggle={() => setHideNames(v => !v)}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});
