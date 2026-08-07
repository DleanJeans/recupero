import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { DailyMetadataContribution, DailyMetadataTotal } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { MetadataDashboardGrid } from './metadata-dashboard-grid';
import { MetadataHeroRow } from './metadata-hero-row';

interface MetadataSummaryRowProps {
  totals: DailyMetadataTotal[];
  contributions: DailyMetadataContribution[];
}

function getTotalKey(item: DailyMetadataTotal): string {
  return `${item.categoryId}:${item.fieldKey}`;
}

function hasGoal(item: DailyMetadataTotal): boolean {
  return item.goal != null && Number.isFinite(item.goal) && item.goal > 0;
}

function groupTotalsByCategory(totals: DailyMetadataTotal[]) {
  return totals.reduce<{ categoryId: string; categoryName: string; items: DailyMetadataTotal[] }[]>((acc, item) => {
    const group = acc.find(existing => existing.categoryId === item.categoryId);
    if (group) {
      group.items.push(item);
    } else {
      acc.push({ categoryId: item.categoryId, categoryName: item.categoryName, items: [item] });
    }
    return acc;
  }, []);
}

export function MetadataSummaryRow({ totals, contributions }: MetadataSummaryRowProps) {
  const [expandedGoalKey, setExpandedGoalKey] = React.useState<string | undefined>();
  const categoryGroups = React.useMemo(() => groupTotalsByCategory(totals), [totals]);
  const contributionsByGoal = React.useMemo(() => {
    const map = new Map<string, DailyMetadataContribution[]>();
    for (const contribution of contributions) {
      const key = `${contribution.categoryId}:${contribution.fieldKey}`;
      const list = map.get(key);
      if (list) {
        list.push(contribution);
      } else {
        map.set(key, [contribution]);
      }
    }
    return map;
  }, [contributions]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.metadataSection, totals.length === 0 && styles.emptyContainer]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {totals.length === 0 ? (
        <Text style={styles.empty}>No metadata for this date.</Text>
      ) : (
        <>
          {categoryGroups.map(group => {
            const goals = group.items.filter(hasGoal);
            const metadata = group.items.filter(item => !hasGoal(item));

            return (
              <View
                key={group.categoryId}
                style={styles.metadataGroup}
              >
                <Text style={styles.metadataGroupTitle}>{group.categoryName}</Text>
                {metadata.length > 0 && (
                  <View style={styles.metadataGroupItems}>
                    {metadata.map(item => (
                      <MetadataHeroRow
                        key={getTotalKey(item)}
                        item={item}
                      />
                    ))}
                  </View>
                )}
                {goals.length > 0 && (
                  <MetadataDashboardGrid
                    items={goals}
                    expandedKey={expandedGoalKey}
                    contributionsByGoal={contributionsByGoal}
                    onToggle={key => setExpandedGoalKey(expandedGoalKey === key ? undefined : key)}
                  />
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  metadataSection: {
    gap: 18,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 48,
  },
  metadataGroup: {
    gap: 10,
  },
  metadataGroupTitle: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataGroupItems: {
    gap: 10,
  },
});
