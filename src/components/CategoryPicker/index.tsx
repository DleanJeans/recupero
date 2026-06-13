import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Category } from '../../types/behavior';
import { Colors } from '../../utils/colors';
import { Button } from '../Button';
import { Text } from '../Text';
import { AddCategoryButton } from './AddCategoryButton';
import { CategoryForm, type CategoryFormProps } from './CategoryForm';

type CategoryId = string | undefined | null;

interface CategoryPickerProps {
  categories: Category[];
  selectedId: CategoryId;
  onChange: (id: CategoryId) => void;
  /** Show as horizontal scrollable filter bar (default: false) */
  horizontal?: boolean;
  /** Show "All" option instead of "None" */
  showAll?: boolean;
  /** Long press handler for editing categories */
  onLongPress?: (category: Category) => void;
  /** Whether the add form is currently open */
  isFormOpen?: boolean;
  /** Toggle add form */
  onToggleForm?: () => void;
  /** Form props when form is open */
  form?: CategoryFormProps;
}

export function CategoryPicker({
  categories,
  selectedId,
  onChange,
  horizontal = false,
  showAll = false,
  onLongPress,
  isFormOpen = false,
  onToggleForm,
  form,
}: CategoryPickerProps) {
  const formContent = isFormOpen && form && <CategoryForm {...form} />;

  if (horizontal) {
    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <CategoryChips
            categories={categories}
            selectedId={selectedId}
            onChange={onChange}
            onLongPress={onLongPress}
            showAll={showAll}
            horizontal
          />
          {onToggleForm && (
            <AddCategoryButton
              isOpen={isFormOpen}
              onPress={onToggleForm}
              style={[styles.horizontalChip, { paddingHorizontal: 8 }]}
            />
          )}
        </ScrollView>
        {formContent}
      </>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Category</Text>
        {onToggleForm && (
          <AddCategoryButton
            isOpen={isFormOpen}
            onPress={onToggleForm}
            style={styles.addButton}
          />
        )}
      </View>
      {formContent}
      <View style={styles.row}>
        <CategoryChips
          categories={categories}
          selectedId={selectedId}
          onChange={onChange}
          onLongPress={onLongPress}
          showAll={showAll}
        />
      </View>
    </View>
  );
}

// #region Subcomponents

interface CategoryChipsProps {
  categories: Category[];
  selectedId: CategoryId;
  onChange: (id: CategoryId) => void;
  onLongPress?: (category: Category) => void;
  showAll?: boolean;
  horizontal?: boolean;
}

function CategoryChips({
  categories,
  selectedId,
  onChange,
  onLongPress,
  showAll = false,
  horizontal = false,
}: CategoryChipsProps) {
  const items: (Category | { id: undefined; emoji: string; name: string })[] = showAll
    ? [{ id: undefined, emoji: '', name: 'All' }, ...categories]
    : [{ id: undefined, emoji: '', name: 'None' }, ...categories];

  return (
    <>
      {items.length === 1 && !showAll && <Text style={styles.emptyHint}>Tap + to create one on the home screen</Text>}
      {items.map(item => {
        const active = item.id === undefined ? selectedId == null : selectedId === item.id;
        return (
          <Button
            key={item.id ?? 'none'}
            variant="ghost"
            size="sm"
            active={active}
            onPress={() => onChange(item.id)}
            onLongPress={item.id && onLongPress ? () => onLongPress(item as Category) : undefined}
            style={[horizontal ? styles.horizontalChip : styles.chip, horizontal && styles.chipHorizontal]}
          >
            <Text style={[styles.chipEmoji, !active && styles.chipEmojiInactive]}>{item.emoji ?? ''}</Text>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
          </Button>
        );
      })}
    </>
  );
}

// #endregion

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
  chip: { backgroundColor: 'transparent', paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  horizontalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  chipHorizontal: {},
  chipEmoji: { fontSize: 16 },
  chipEmojiInactive: { opacity: 0.4 },
  chipText: { color: Colors.text.faint, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: Colors.text.primary },
  emptyHint: { color: Colors.text.dim, fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
});
