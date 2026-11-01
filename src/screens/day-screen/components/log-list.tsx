import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { Category } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import type { DayTimelineItem } from '../../../utils/day-timeline-utils';
import { formatDuration, MS_PER_MINUTE } from '../../../utils/time-utils';
import { DayLogCard } from './day-log-card';
import { StackedLogGroup } from './stacked-log-group';
import { StateLogCard } from './state-log-card';

interface LogListProps {
  items: DayTimelineItem[];
  selectedDate: string;
  categories: Category[];
  onEditLog: (behaviorId: string, logId: string) => void;
}

export function LogList({ items, selectedDate, categories, onEditLog }: LogListProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {items.length === 0 ? (
        <Text style={styles.empty}>No logs for this date.</Text>
      ) : (
        items.map((item, index) => {
          const previousItem = items[index - 1];
          const gap = previousItem ? previousItem.timestamp - item.timestamp : 0;
          const showGap = gap >= MS_PER_MINUTE;
          return (
            <React.Fragment key={item.key}>
              {showGap && (
                <View style={styles.gapRow}>
                  <View style={styles.gapDot} />
                  <Text style={styles.gapText}>{formatDuration(gap)}</Text>
                  <View style={styles.gapDot} />
                </View>
              )}
              {item.kind === 'mood' ? (
                <StateLogCard
                  kind="mood"
                  log={item.log}
                />
              ) : item.kind === 'body' ? (
                <StateLogCard
                  kind="body"
                  log={item.log}
                />
              ) : item.entries.length > 1 ? (
                <StackedLogGroup
                  entries={item.entries}
                  selectedDate={selectedDate}
                  categories={categories}
                  onEditLog={onEditLog}
                />
              ) : (
                <DayLogCard
                  entry={item.entries[0]}
                  selectedDate={selectedDate}
                  categories={categories}
                  onEditLog={onEditLog}
                />
              )}
            </React.Fragment>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 48,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  gapDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.light,
  },
  gapText: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '500',
  },
});
