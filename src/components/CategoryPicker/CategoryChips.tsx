import React from 'react';
import { StyleSheet } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import type { Category } from '../../types/behavior';
import { Colors } from '../../utils/colors';
import { Text } from '../Text';
import { CategoryBarChip } from './CategoryBarChip';

type CategoryId = string | undefined | null;

export interface CategoryChipsProps {
  categories: Category[];
  selectedId: CategoryId;
  onChange: (id: CategoryId) => void;
  onLongPress?: (category: Category) => void;
  showAll?: boolean;
  /** Render as a horizontal scrollable filter bar (default: false) */
  bar?: boolean;
  /** Count of behaviors per category. */
  behaviorCounts?: Record<string, number>;
  /** Total behavior count, shown on the "All" chip when `showAll` is true. */
  allCount?: number;
  /** Override the global "hide category names" setting. `true` = always show names regardless of store. */
  forceShowNames?: boolean;
}

type ChipItem = Category | { id: undefined; emoji: string; name: string };

export function CategoryChips({
  categories,
  selectedId,
  onChange,
  onLongPress,
  showAll = false,
  bar = false,
  behaviorCounts,
  allCount,
  forceShowNames = false,
}: CategoryChipsProps) {
  const storeHideNames = useSettingsStore(s => s.hideCategoryNames);
  const hideNames = !forceShowNames && storeHideNames;
  const items: ChipItem[] = showAll
    ? [{ id: undefined, emoji: '', name: 'All' }, ...categories]
    : [{ id: undefined, emoji: '', name: 'None' }, ...categories];

  return (
    <>
      {items.length === 1 && !showAll && <Text style={styles.emptyHint}>Tap + to create one on the home screen</Text>}
      {items.map(item => {
        const active = item.id === undefined ? selectedId == null : selectedId === item.id;
        const count = item.id == null ? allCount : behaviorCounts?.[item.id];
        const showLabel = !hideNames || (showAll && item.id == null);
        const onLongPressItem = item.id && onLongPress ? () => onLongPress(item as Category) : undefined;
        return (
          <CategoryBarChip
            key={item.id ?? 'none'}
            icon={item.emoji ?? ''}
            label={item.name}
            count={count}
            showLabel={showLabel}
            active={active}
            bar={bar}
            onPress={() => onChange(item.id)}
            onLongPress={onLongPressItem}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  emptyHint: { color: Colors.text.dim, fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
});
