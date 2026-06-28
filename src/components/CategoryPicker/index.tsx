import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { BehaviorEntry, Category, MetadataField } from '../../types/behavior';
import { computeBehaviorCounts } from '../../utils/behaviorCounts';
import { Colors } from '../../utils/colors';
import { Text } from '../Text';
import { AddCategoryButton } from './AddCategoryButton';
import { CategoryChips } from './CategoryChips';
import { CategoryForm } from './CategoryForm';

type CategoryId = string | undefined | null;

interface CategoryPickerProps {
  categories: Category[];
  selectedId: CategoryId;
  onChange: (id: CategoryId) => void;
  /** Render as a horizontal scrollable filter bar (default: false) */
  bar?: boolean;
  /** Show "All" option instead of "None" */
  showAll?: boolean;
  /** External long-press hook (e.g. analytics). Internal edit flow is also triggered. */
  onLongPress?: (category: Category) => void;
  /** Behaviors used to compute per-category and total counts. */
  behaviors: BehaviorEntry[];
  /** Override the global "hide category names" setting. `true` = always show names regardless of store. */
  forceShowNames?: boolean;
  /** Optional leading element rendered at the start of the horizontal filter bar. */
  leadingAccessory?: ReactNode;
  /** Use darker background for nested contexts (e.g. inside a form) */
  dark?: boolean;
  /** Called after a new category is created. Receives the new category id. */
  onCategoryCreated?: (id: string) => void;
  /** Called after a category is deleted. Receives the deleted category id. */
  onCategoryDeleted?: (id: string) => void;
}

export function CategoryPicker({
  categories,
  selectedId,
  onChange,
  bar = false,
  showAll = false,
  onLongPress,
  behaviors,
  leadingAccessory,
  dark = false,
  onCategoryCreated,
  onCategoryDeleted,
  forceShowNames,
}: CategoryPickerProps) {
  const { addCategory, removeCategory, updateCategory } = useBehaviorStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);

  const isEditing = editingId != null;
  const isFormOpen = showForm || isEditing;
  const editingCategory = editingId ? categories.find(c => c.id === editingId) : undefined;

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setEmoji('');
    setName('');
    setMetadataFields([]);
  };

  const handleLongPress = (category: Category) => {
    setEditingId(category.id);
    setEmoji(category.emoji);
    setName(category.name);
    setMetadataFields(category.metadataFields ?? []);
    onLongPress?.(category);
  };

  const toggleForm = () => {
    if (isFormOpen) {
      resetForm();
    } else {
      setShowForm(true);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji || !trimmedName) return;
    const mf = metadataFields.length > 0 ? metadataFields : undefined;
    if (editingId) {
      updateCategory(editingId, { name: trimmedName, emoji: trimmedEmoji, metadataFields: mf });
      resetForm();
    } else {
      const beforeCount = useBehaviorStore.getState().categories.length;
      addCategory(trimmedName, trimmedEmoji, mf);
      const newCat = useBehaviorStore.getState().categories[beforeCount];
      resetForm();
      if (newCat) onCategoryCreated?.(newCat.id);
    }
  };

  const handleDelete = () => {
    if (!editingId || !editingCategory) return;
    const id = editingId;
    const cat = editingCategory;
    resetForm();
    Alert.alert(`Delete "${cat.name}"?`, 'Behaviors in this category will lose their category assignment.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeCategory(id);
          onCategoryDeleted?.(id);
        },
      },
    ]);
  };

  const { behaviorCounts, allCount } = useMemo(() => computeBehaviorCounts(behaviors), [behaviors]);

  const formProps = {
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
    dark,
  };

  const chipsProps = {
    categories,
    selectedId,
    onChange,
    onLongPress: handleLongPress,
    showAll,
    behaviorCounts,
    allCount,
    forceShowNames,
  };

  const addButtonProps = {
    isOpen: isFormOpen,
    onPress: toggleForm,
    style: styles.barChip,
  };

  if (bar) {
    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {leadingAccessory}
          <CategoryChips bar {...chipsProps} />
          <AddCategoryButton {...addButtonProps} />
        </ScrollView>
        {isFormOpen && <View style={{ marginHorizontal: 16 }}>
          <CategoryForm {...formProps} />
        </View>}
      </>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Category</Text>
      </View>

      <View style={styles.row}>
        <CategoryChips {...chipsProps} />
        <AddCategoryButton {...addButtonProps} />
      </View>
      {isFormOpen && <CategoryForm {...formProps} />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.elevated,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scrollContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  barChip: { paddingHorizontal: 8 },
});
