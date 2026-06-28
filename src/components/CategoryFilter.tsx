import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { CategoryPicker } from './CategoryPicker';
import { ToggleNamesButton } from './CategoryPicker/ToggleNamesButton';

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoryFilter = React.memo(function CategoryFilter({
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  const categories = useBehaviorStore(s => s.categories);
  const behaviors = useBehaviorStore(s => s.behaviors);
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
