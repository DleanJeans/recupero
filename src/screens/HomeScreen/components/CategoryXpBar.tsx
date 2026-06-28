import { useIsFocused } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { Colors } from '../../../utils/colors';
import { getEffectiveLogCount } from '../../../utils/xpUtils';

const EMPTY_BEHAVIORS: ReturnType<typeof useBehaviorStore.getState>['behaviors'] = [];
const EMPTY_CATEGORIES: ReturnType<typeof useBehaviorStore.getState>['categories'] = [];

interface Props {
  selectedCategoryId: string | null;
}
export function CategoryXpBar({ selectedCategoryId }: Props) {
  const isFocused = useIsFocused();
  const behaviors = useBehaviorStore(s => (isFocused ? s.behaviors : EMPTY_BEHAVIORS));
  const categories = useBehaviorStore(s => (isFocused ? s.categories : EMPTY_CATEGORIES));

  const logCount = useMemo(() => {
    if (selectedCategoryId === null) return 0;
    let total = 0;
    for (const behavior of behaviors) {
      if (behavior.categoryId !== selectedCategoryId || !behavior.xpEnabled) continue;
      const effective = getEffectiveLogCount(behavior);
      if (effective > 0) total += effective;
    }
    return total;
  }, [behaviors, selectedCategoryId]);

  if (selectedCategoryId === null) return null;

  const category = categories.find(c => c.id === selectedCategoryId);
  if (!category) return null;

  if (logCount === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{category.emoji}</Text>
        <View style={styles.barContainer}>
          <XpBar
            logCount={logCount}
            color={Colors.type.category}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  barContainer: {
    flex: 1,
  },
});
