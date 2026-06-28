import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { CategoryPicker } from './CategoryPicker';
import { ToggleNamesButton } from './CategoryPicker/ToggleNamesButton';

const EMPTY_BEHAVIORS: ReturnType<typeof useBehaviorStore.getState>['behaviors'] = [];
const EMPTY_CATEGORIES: ReturnType<typeof useBehaviorStore.getState>['categories'] = [];

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoryFilter = React.memo(function CategoryFilter({
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  const isFocused = useIsFocused();
  const categories = useBehaviorStore(s => (isFocused ? s.categories : EMPTY_CATEGORIES));
  const behaviors = useBehaviorStore(s => (isFocused ? s.behaviors : EMPTY_BEHAVIORS));
  const handleChange = useCallback((id: string | undefined | null) => onSelectCategory(id ?? null), [onSelectCategory]);
  const leadingAccessory = useMemo(() => <ToggleNamesButton />, []);

  return (
    <View style={styles.container}>
      <CategoryPicker
        categories={categories}
        selectedId={selectedCategoryId}
        onChange={handleChange}
        bar
        showAll
        behaviors={behaviors}
        leadingAccessory={leadingAccessory}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});
