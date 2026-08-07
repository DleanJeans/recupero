import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { DailyMetadataContribution, DailyMetadataTotal } from '../../../utils/behavior-utils';
import { MetadataTotalItem } from './metadata-total-item';

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
  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={styles.grid}
    >
      {items.map(item => {
        const key = getTotalKey(item);
        const expanded = key === expandedKey;
        return (
          <MetadataTotalItem
            key={key}
            item={item}
            expanded={expanded}
            contributions={contributionsByGoal.get(key) ?? []}
            onPress={() => onToggle(key)}
            style={expanded ? styles.fullWidth : styles.halfWidth}
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
