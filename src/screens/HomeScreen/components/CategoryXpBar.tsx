import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { Colors } from '../../../utils/colors';
import { getEffectiveLogCount } from '../../../utils/xpUtils';

interface Props {
  selectedCategoryId: string | null;
}
export function CategoryXpBar({ selectedCategoryId }: Props) {
  const { behaviors, categories } = useBehaviorStore();

  const logCount = useMemo(() => {
    if (selectedCategoryId === null) return 0;
    return (
      behaviors
        .filter(b => b.categoryId === selectedCategoryId)
        // Skip behaviors with XP disabled, or where decay has wiped the effective count to 0.
        .filter(b => b.xpEnabled)
        .reduce((sum, b) => {
          const effective = getEffectiveLogCount(b);
          return sum + (effective > 0 ? effective : 0);
        }, 0)
    );
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
