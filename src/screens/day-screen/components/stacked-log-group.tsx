import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { Category } from '../../../types/behavior';
import type { DayLogEntry } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { DayLogCard } from './day-log-card';

interface StackedLogGroupProps {
  entries: DayLogEntry[];
  selectedDate: string;
  categories: Category[];
  onEditLog: (behaviorId: string, logId: string) => void;
}

/** Behaviours logged together with habit stacking, shown as one bracketed group. */
export function StackedLogGroup({ entries, selectedDate, categories, onEditLog }: StackedLogGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Stacked · {entries.length} behaviours</Text>
      <View style={styles.cards}>
        {entries.map(entry => (
          <DayLogCard
            key={entry.log.id}
            entry={entry}
            selectedDate={selectedDate}
            categories={categories}
            onEditLog={onEditLog}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border.light,
    paddingLeft: 10,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cards: {
    gap: 6,
  },
});
