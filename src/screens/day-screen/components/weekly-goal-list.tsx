import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';
import { toDateString } from '../../../utils/date-utils';
import { getWeeklyGoalSummaries } from '../../../utils/weekly-goal-utils';
import { SkipDaysRow } from './skip-days-row';
import { WeeklyGoalCard } from './weekly-goal-card';

interface WeeklyGoalListProps {
  selectedDate: string;
}

export function WeeklyGoalList({ selectedDate }: WeeklyGoalListProps) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const todayStr = toDateString(new Date(), dayCutoffHour);
  const [skipEditingId, setSkipEditingId] = useState<string | undefined>();

  const groups = useMemo(() => {
    const summaries = getWeeklyGoalSummaries(behaviors, categories, selectedDate, todayStr, dayCutoffHour);
    return summaries.reduce<{ categoryId: string; categoryName: string; items: typeof summaries }[]>((acc, item) => {
      const group = acc.find(existing => existing.categoryId === item.categoryId);
      if (group) {
        group.items.push(item);
      } else {
        acc.push({ categoryId: item.categoryId, categoryName: item.categoryName, items: [item] });
      }
      return acc;
    }, []);
  }, [behaviors, categories, dayCutoffHour, selectedDate, todayStr]);

  const includesToday = selectedDate === todayStr;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.content, groups.length === 0 && styles.emptyContainer]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {groups.length === 0 ? (
        <Text style={styles.empty}>No daily goals yet. Set a daily goal on a category's metadata field.</Text>
      ) : (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.dashSwatch} />
              <Text style={styles.legendText}>Daily goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.lineSwatch, { backgroundColor: Colors.metadataBar[0] }]} />
              <Text style={styles.legendText}>7-day average</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.boxSwatch, { backgroundColor: Colors.star.filled }]} />
              <Text style={styles.legendText}>Over goal</Text>
            </View>
          </View>
          {includesToday && (
            <Text style={styles.caption}>Today is still in progress, so it is not in the average.</Text>
          )}
          {groups.map(group => (
            <View
              key={group.categoryId}
              style={styles.group}
            >
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.categoryName}</Text>
                <Pressable
                  hitSlop={8}
                  accessibilityRole="button"
                  onPress={() => setSkipEditingId(skipEditingId === group.categoryId ? undefined : group.categoryId)}
                >
                  <Text style={styles.skipButton}>{skipEditingId === group.categoryId ? 'Done' : 'Skip days'}</Text>
                </Pressable>
              </View>
              {skipEditingId === group.categoryId && (
                <SkipDaysRow
                  categoryId={group.categoryId}
                  days={group.items[0].days}
                />
              )}
              {group.items.map(summary => (
                <WeeklyGoalCard
                  key={`${summary.categoryId}:${summary.fieldKey}`}
                  summary={summary}
                  selectedDate={selectedDate}
                />
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 14,
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
  legend: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  dashSwatch: {
    width: 12,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.text.light,
  },
  lineSwatch: {
    width: 12,
    height: 2,
  },
  boxSwatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  caption: {
    color: Colors.text.faint,
    fontSize: 11,
    paddingHorizontal: 2,
    marginTop: -6,
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    color: Colors.metadataBar[0],
    fontSize: 12,
    fontWeight: '700',
  },
  groupTitle: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
