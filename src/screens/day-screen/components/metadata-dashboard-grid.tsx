import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { DailyMetadataContribution, DailyMetadataTotal } from '../../../utils/behavior-utils';
import { MetadataTotalCard } from './metadata-total-card';

interface MetadataDashboardGridProps {
  items: DailyMetadataTotal[];
  expandedKey?: string;
  contributionsByGoal: Map<string, DailyMetadataContribution[]>;
  onToggle: (key: string) => void;
}

function getTotalKey(item: DailyMetadataTotal): string {
  return `${item.categoryId}:${item.fieldKey}`;
}

export function MetadataDashboardGrid({
  items,
  expandedKey,
  contributionsByGoal,
  onToggle,
}: MetadataDashboardGridProps) {
  const expandedIndex = expandedKey ? items.findIndex(item => getTotalKey(item) === expandedKey) : -1;
  const hasOrphanBeforeExpanded = expandedIndex > 0 && expandedIndex % 2 === 1;
  const unexpandedCountAfterExpanded = expandedIndex >= 0 ? items.length - expandedIndex - 1 : 0;
  const hasOrphanAfterExpanded = unexpandedCountAfterExpanded % 2 === 1;

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={styles.grid}
    >
      {items.map((item, index) => {
        const key = getTotalKey(item);
        const expanded = key === expandedKey;
        const orphan =
          (hasOrphanBeforeExpanded && index === expandedIndex - 1) ||
          (hasOrphanAfterExpanded && index === items.length - 1);
        return (
          <MetadataTotalCard
            key={key}
            item={item}
            expanded={expanded}
            contributions={contributionsByGoal.get(key) ?? []}
            onPress={() => onToggle(key)}
            style={expanded || orphan ? styles.fullWidth : styles.halfWidth}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 10,
  },
  halfWidth: {
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  },
});
