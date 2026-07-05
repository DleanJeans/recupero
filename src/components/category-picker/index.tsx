import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BehaviorEntry, Category } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { computeBehaviorCounts } from '../../utils/behavior-counts';
import { Colors } from '../../utils/colors';
import { Text } from '../text';
import { AddCategoryButton } from './add-category-button';
import { CategoryChips } from './category-chips';

type CategoryId = string | undefined | null;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  behaviors?: BehaviorEntry[];
  /** Override the global "hide category names" setting. `true` = always show names regardless of store. */
  forceShowNames?: boolean;
  /** Optional leading element rendered at the start of the horizontal filter bar. */
  leadingAccessory?: ReactNode;
  /** Select a newly created category after returning to the source screen. */
  selectCreatedCategoryOnSave?: boolean;
}

const EMPTY_BEHAVIORS: BehaviorEntry[] = [];

export function CategoryPicker({
  categories,
  selectedId,
  onChange,
  bar = false,
  showAll = false,
  onLongPress,
  behaviors = EMPTY_BEHAVIORS,
  leadingAccessory,
  selectCreatedCategoryOnSave = false,
  forceShowNames,
}: CategoryPickerProps) {
  const navigation = useNavigation<NavigationProp>();

  const handleLongPress = (category: Category) => {
    onLongPress?.(category);
    navigation.navigate('CategoryForm', {
      categoryId: category.id,
      selectOnSave: selectCreatedCategoryOnSave,
    });
  };

  const handleAddPress = () => {
    navigation.navigate('CategoryForm', {
      selectOnSave: selectCreatedCategoryOnSave,
    });
  };

  const { behaviorCounts, allCount } = useMemo(
    () => (bar ? computeBehaviorCounts(behaviors) : { behaviorCounts: undefined, allCount: undefined }),
    [bar, behaviors],
  );

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
    isOpen: false,
    onPress: handleAddPress,
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
          <CategoryChips
            bar
            {...chipsProps}
          />
          <AddCategoryButton {...addButtonProps} />
        </ScrollView>
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
