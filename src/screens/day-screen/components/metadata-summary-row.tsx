import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { Text } from '../../../components/text';
import type { DailyMetadataContribution, DailyMetadataTotal } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { GoalContributionList } from './goal-contribution-list';
import { MetadataTotalItem } from './metadata-total-item';

interface MetadataSummaryRowProps {
  totals: DailyMetadataTotal[];
  contributions: DailyMetadataContribution[];
}

const GOAL_EXPAND_ENTERING = FadeInDown.duration(180);
const GOAL_EXPAND_EXITING = FadeOutUp.duration(140);
const GOAL_EXPAND_LAYOUT = LinearTransition.duration(200);

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
    >
      {totals.length === 0 ? (
        <Text style={styles.empty}>No metadata for this date.</Text>
      ) : (
        <>
          {categoryGroups.map(group => {
            const goals = group.items.filter(hasGoal);
            const metadata = group.items.filter(item => !hasGoal(item));

            return (
              <Animated.View
                key={group.categoryId}
                layout={GOAL_EXPAND_LAYOUT}
                style={styles.metadataGroup}
              >
                <Text style={styles.metadataGroupTitle}>{group.categoryName}</Text>
                {metadata.length > 0 && (
                  <Animated.View
                    layout={GOAL_EXPAND_LAYOUT}
                    style={styles.metadataGroupItems}
                  >
                    {metadata.map(item => (
                      <MetadataTotalItem
                        key={getTotalKey(item)}
                        item={item}
                      />
                    ))}
                  </Animated.View>
                )}
                {goals.length > 0 && (
                  <Animated.View
                    layout={GOAL_EXPAND_LAYOUT}
                    style={styles.goalItems}
                  >
                    {goals.map(item => {
                      const key = getTotalKey(item);
                      const expanded = expandedGoalKey === key;
                      return (
                        <Animated.View
                          key={key}
                          layout={GOAL_EXPAND_LAYOUT}
                          style={styles.goalItem}
                        >
                          <MetadataTotalItem
                            item={item}
                            expanded={expanded}
                            onPress={() => setExpandedGoalKey(expanded ? undefined : key)}
                          />
                          {expanded && (
                            <Animated.View
                              entering={GOAL_EXPAND_ENTERING}
                              exiting={GOAL_EXPAND_EXITING}
                            >
                              <GoalContributionList contributions={contributionsByGoal.get(key) ?? []} />
                            </Animated.View>
                          )}
                        </Animated.View>
                      );
                    })}
                  </Animated.View>
                )}
              </Animated.View>
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
    paddingHorizontal: 24,
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
    gap: 8,
  },
  metadataGroupTitle: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalItems: {
    gap: 8,
  },
  goalItem: {
    gap: 8,
  },
  metadataGroupItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
