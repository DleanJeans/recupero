import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useBehaviorStore } from '../../../store/behaviorStore';
import type { BehaviorType } from '../../../types/behavior';
import { getBehaviorTypeColor } from '../../../utils/behaviorTypeUtils';
import { getEffectiveXp } from '../../../utils/xpUtils';

const TYPE_LABELS: Record<BehaviorType, string> = {
  desirable: 'Desirable',
  neutral: 'Neutral',
  undesirable: 'Undesirable',
};

const TYPE_ORDER: BehaviorType[] = ['desirable', 'neutral', 'undesirable'];

interface Props {
  selectedCategoryId: string | null;
}
export function TypeXpBar({ selectedCategoryId }: Props) {
  const behaviors = useBehaviorStore(s => s.behaviors);

  const typeXp = useMemo(() => {
    const counts: Record<BehaviorType, number> = { desirable: 0, neutral: 0, undesirable: 0 };
    for (const behavior of behaviors) {
      if (selectedCategoryId !== null && behavior.categoryId !== selectedCategoryId) continue;
      if (!behavior.xpEnabled) continue;
      const effectiveXp = getEffectiveXp(behavior);
      if (effectiveXp === 0) continue;
      counts[behavior.type ?? 'neutral'] += effectiveXp;
    }
    return counts;
  }, [behaviors, selectedCategoryId]);

  const hasLogs = TYPE_ORDER.some(t => typeXp[t] > 0);
  if (!hasLogs) return null;

  return (
    <View style={styles.section}>
      {TYPE_ORDER.map(type => {
        const xp = typeXp[type];
        if (xp === 0) return null;
        return (
          <View
            key={type}
            style={styles.row}
          >
            <Text style={[styles.label, { color: getBehaviorTypeColor(type) }]}>{TYPE_LABELS[type]}</Text>
            <View style={styles.barContainer}>
              <XpBar
                xp={xp}
                color={getBehaviorTypeColor(type)}
              />
            </View>
          </View>
        );
      })}
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 72,
  },
  barContainer: {
    flex: 1,
  },
});
