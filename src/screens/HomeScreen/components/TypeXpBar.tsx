import { useIsFocused } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useBehaviorStore } from '../../../store/behaviorStore';
import type { BehaviorType } from '../../../types/behavior';
import { getBehaviorTypeColor } from '../../../utils/behaviorTypeUtils';
import { getEffectiveLogCount } from '../../../utils/xpUtils';

const EMPTY_BEHAVIORS: ReturnType<typeof useBehaviorStore.getState>['behaviors'] = [];

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
  const isFocused = useIsFocused();
  const behaviors = useBehaviorStore(s => (isFocused ? s.behaviors : EMPTY_BEHAVIORS));

  const typeLogCounts = useMemo(() => {
    const counts: Record<BehaviorType, number> = { desirable: 0, neutral: 0, undesirable: 0 };
    for (const behavior of behaviors) {
      if (selectedCategoryId !== null && behavior.categoryId !== selectedCategoryId) continue;
      // Skip behaviors with XP disabled, or where decay has wiped the effective count to 0.
      if (!behavior.xpEnabled) continue;
      const effective = getEffectiveLogCount(behavior);
      if (effective === 0) continue;
      counts[behavior.type ?? 'neutral'] += effective;
    }
    return counts;
  }, [behaviors, selectedCategoryId]);

  const hasLogs = TYPE_ORDER.some(t => typeLogCounts[t] > 0);
  if (!hasLogs) return null;

  return (
    <View style={styles.section}>
      {TYPE_ORDER.map(type => {
        const logCount = typeLogCounts[type];
        if (logCount === 0) return null;
        return (
          <View
            key={type}
            style={styles.row}
          >
            <Text style={[styles.label, { color: getBehaviorTypeColor(type) }]}>{TYPE_LABELS[type]}</Text>
            <View style={styles.barContainer}>
              <XpBar
                logCount={logCount}
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
