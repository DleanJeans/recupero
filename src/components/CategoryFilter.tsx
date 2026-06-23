import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { CategoryPicker } from './CategoryPicker';
import { ToggleNamesButton } from './CategoryPicker/ToggleNamesButton';

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function CategoryFilter({ selectedCategoryId, onSelectCategory }: CategoryFilterProps) {
  const { categories, behaviors } = useBehaviorStore();

  return (
    <View style={styles.container}>
      <CategoryPicker
        categories={categories}
        selectedId={selectedCategoryId}
        onChange={id => onSelectCategory(id ?? null)}
        horizontal
        showAll
        behaviors={behaviors}
        leadingAccessory={<ToggleNamesButton />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});
