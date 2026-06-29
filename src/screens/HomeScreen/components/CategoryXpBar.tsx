import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { Colors } from '../../../utils/colors';
import { getEffectiveXp } from '../../../utils/xpUtils';

interface Props {
  selectedCategoryId: string | null;
}
export function CategoryXpBar({ selectedCategoryId }: Props) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);

  const xp = useMemo(() => {
    if (selectedCategoryId === null) return 0;
    let total = 0;
    for (const behavior of behaviors) {
      if (behavior.categoryId !== selectedCategoryId || !behavior.xpEnabled) continue;
      const effectiveXp = getEffectiveXp(behavior, Date.now(), dayCutoffHour);
      if (effectiveXp > 0) total += effectiveXp;
    }
    return total;
  }, [behaviors, dayCutoffHour, selectedCategoryId]);

  if (selectedCategoryId === null) return null;

  const category = categories.find(c => c.id === selectedCategoryId);
  if (!category) return null;

  if (xp === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{category.emoji}</Text>
        <View style={styles.barContainer}>
          <XpBar
            xp={xp}
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
