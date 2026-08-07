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
  const expandedIndex = expandedKey ? items.findIndex(item => getTotalKey(item) === expandedKey) : -1;
  const beforeExpanded = expandedIndex >= 0 ? items.slice(0, expandedIndex) : items;
  const afterExpanded = expandedIndex >= 0 ? items.slice(expandedIndex + 1) : [];
  const rows: DailyMetadataTotal[][] = [];

  for (let index = 0; index < beforeExpanded.length; index += 2) {
    rows.push(beforeExpanded.slice(index, index + 2));
  }
  if (expandedIndex >= 0) {
    rows.push([items[expandedIndex]]);
  }
  for (let index = 0; index < afterExpanded.length; index += 2) {
    rows.push(afterExpanded.slice(index, index + 2));
  }

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={styles.grid}
    >
      {rows.map(row => (
        <Animated.View
          key={row.map(getTotalKey).join('|')}
          layout={LinearTransition.duration(200)}
          style={styles.row}
        >
          {row.map(item => {
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
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
});
