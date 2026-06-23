import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BehaviorEntry, Category } from '../../types/behavior';
import { computeBehaviorCounts } from '../../utils/behaviorCounts';
import { Colors } from '../../utils/colors';
import { Text } from '../Text';
import { AddCategoryButton } from './AddCategoryButton';
import { CategoryChips } from './CategoryChips';
import { CategoryForm, type CategoryFormProps } from './CategoryForm';
import { ToggleNamesButton } from './ToggleNamesButton';

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
  /** Behaviors used to compute per-category and total counts. */
  behaviors: BehaviorEntry[];
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
  behaviors,
}: CategoryPickerProps) {
  const { behaviorCounts, allCount } = useMemo(() => computeBehaviorCounts(behaviors), [behaviors]);
  const formContent = isFormOpen && form && <CategoryForm {...form} />;

  if (horizontal) {
    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ToggleNamesButton style={styles.horizontalChip} />
          <CategoryChips
            categories={categories}
            selectedId={selectedId}
            onChange={onChange}
            onLongPress={onLongPress}
            showAll={showAll}
            horizontal
            behaviorCounts={behaviorCounts}
            allCount={allCount}
          />
          {onToggleForm && (
            <AddCategoryButton
              isOpen={isFormOpen}
              onPress={onToggleForm}
              style={styles.horizontalChip}
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
          behaviorCounts={behaviorCounts}
          allCount={allCount}
        />
      </View>
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
  horizontalChip: { paddingHorizontal: 8 },
});
