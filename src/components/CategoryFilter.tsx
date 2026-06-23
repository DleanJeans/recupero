import React, { useState } from 'react';
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
  const [hideNames, setHideNames] = useState(false);

  return (
    <View style={styles.container}>
      <CategoryPicker
        categories={categories}
        selectedId={selectedCategoryId}
        onChange={id => onSelectCategory(id ?? null)}
        horizontal
        showAll
        behaviors={behaviors}
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
