import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import type { DailyMetadataTotal } from '../../../utils/behaviorUtils';
import { Colors } from '../../../utils/colors';
import { MetadataTotalItem } from './MetadataTotalItem';

interface MetadataSummaryRowProps {
  totals: DailyMetadataTotal[];
}

export function MetadataSummaryRow({ totals }: MetadataSummaryRowProps) {
  if (totals.length === 0) return null;

  const groups = totals.reduce<{ categoryId: string; categoryName: string; items: DailyMetadataTotal[] }[]>(
    (acc, item) => {
      const group = acc.find(existing => existing.categoryId === item.categoryId);
      if (group) {
        group.items.push(item);
      } else {
        acc.push({ categoryId: item.categoryId, categoryName: item.categoryName, items: [item] });
      }
      return acc;
    },
    [],
  );

  return (
    <View style={styles.metadataSection}>
      {groups.map(group => (
        <View
          key={group.categoryId}
          style={styles.metadataGroup}
        >
          <Text style={styles.metadataGroupTitle}>{group.categoryName}</Text>
          <View style={styles.metadataGroupItems}>
            {group.items.map(item => (
              <MetadataTotalItem
                key={item.label}
                item={item}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metadataSection: {
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  metadataGroup: {
    gap: 6,
  },
  metadataGroupTitle: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataGroupItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
