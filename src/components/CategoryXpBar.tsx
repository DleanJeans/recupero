import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import { Colors } from '../utils/colors';
import { Text } from './Text';
import { XpBar } from './XpBar';

interface Props {
  selectedCategoryId: string | null;
}
export function CategoryXpBar({ selectedCategoryId }: Props) {
  const { behaviors, categories } = useBehaviorStore();

  const logCount = useMemo(() => {
    if (selectedCategoryId === null) return 0;
    return behaviors.filter(b => b.categoryId === selectedCategoryId).reduce((sum, b) => sum + b.logs.length, 0);
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
            color="#f472b6"
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
    color: Colors.textPrimary,
  },
  barContainer: {
    flex: 1,
  },
});
