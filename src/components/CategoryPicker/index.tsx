import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BehaviorEntry, Category } from '../../types/behavior';
import { computeBehaviorCounts } from '../../utils/behaviorCounts';
import { Colors } from '../../utils/colors';
import { Button } from '../Button';
import { Text } from '../Text';
import { AddCategoryButton } from './AddCategoryButton';
import { CategoryChips } from './CategoryChips';
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
  const [hideNames, setHideNames] = useState(false);
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
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setHideNames(v => !v)}
            style={[styles.horizontalChip, { paddingHorizontal: 8 }]}
            accessibilityLabel={hideNames ? 'Show category names' : 'Hide category names'}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={'text-outline'}
                size={18}
                color={Colors.text.muted}
              />
              {hideNames && (
                <View style={styles.strikethrough}>
                  <View style={styles.strikethroughInner} />
                </View>
              )}
            </View>
          </Button>
          <CategoryChips
            categories={categories}
            selectedId={selectedId}
            onChange={onChange}
            onLongPress={onLongPress}
            showAll={showAll}
            horizontal
            behaviorCounts={behaviorCounts}
            allCount={allCount}
            hideNames={hideNames}
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
          behaviorCounts={behaviorCounts}
          allCount={allCount}
          hideNames={hideNames}
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
  horizontalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  iconWrap: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strikethrough: {
    position: 'absolute',
    width: 24,
    height: 4.5,
    backgroundColor: Colors.bg.card,
    transform: [{ rotate: '-45deg' }],
  },
  strikethroughInner: {
    height: 1.5,
    backgroundColor: Colors.text.muted,
    position: 'absolute',
    top: 1.5,
    left: 0,
    right: 0,
    borderRadius: 2,
  },
});
