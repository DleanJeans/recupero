import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { Category } from '../../../types/behavior';
import type { DayLogEntry } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { formatDuration, MS_PER_MINUTE } from '../../../utils/time-utils';
import { DayLogCard } from './day-log-card';

interface LogListProps {
  entries: DayLogEntry[];
  selectedDate: string;
  categories: Category[];
  onEditLog: (behaviorId: string, logId: string) => void;
}

export function LogList({ entries, selectedDate, categories, onEditLog }: LogListProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {entries.length === 0 ? (
        <Text style={styles.empty}>No logs for this date.</Text>
      ) : (
        entries.map((entry, index) => {
          const previousEntry = entries[index - 1];
          const gap = previousEntry ? previousEntry.log.timestamp - entry.log.timestamp : 0;
          const showGap = gap >= MS_PER_MINUTE;
          return (
            <React.Fragment key={entry.log.id}>
              {showGap && (
                <View style={styles.gapRow}>
                  <View style={styles.gapDot} />
                  <Text style={styles.gapText}>{formatDuration(gap)}</Text>
                  <View style={styles.gapDot} />
                </View>
              )}
              <DayLogCard
                entry={entry}
                selectedDate={selectedDate}
                categories={categories}
                onEditLog={onEditLog}
              />
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
