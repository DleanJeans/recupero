import React from 'react';
import { StyleSheet } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import type { Category } from '../../types/behavior';
import { Colors } from '../../utils/colors';
import { Button } from '../Button';
import { Text } from '../Text';

type CategoryId = string | undefined | null;

export interface CategoryChipsProps {
  categories: Category[];
  selectedId: CategoryId;
  onChange: (id: CategoryId) => void;
  onLongPress?: (category: Category) => void;
  showAll?: boolean;
  horizontal?: boolean;
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
  horizontal = false,
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
            {(!hideNames || (showAll && item.id == null)) && (
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            )}
            {count != null && horizontal && (
              <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
            )}
          </Button>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
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
  chipCount: { color: Colors.text.dim, fontSize: 11, fontWeight: '500', marginTop: 1 },
  chipCountActive: { color: Colors.text.muted },
  emptyHint: { color: Colors.text.dim, fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
});
