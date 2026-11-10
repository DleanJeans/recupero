import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';
import { formatWeekdayInitial } from '../../../utils/weekly-goal-format';
import type { WeeklyGoalDay } from '../../../utils/weekly-goal-utils';

interface SkipDaysRowProps {
  categoryId: string;
  days: WeeklyGoalDay[];
}

export function SkipDaysRow({ categoryId, days }: SkipDaysRowProps) {
  const toggleSkippedDate = useBehaviorStore(s => s.toggleCategoryGoalSkippedDate);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Tap days to leave out of the average, e.g. dinner out when you could not weigh or look up macros.
      </Text>
      <View style={styles.row}>
        {days.map(day => (
          <Pressable
            key={day.date}
            style={[styles.chip, day.skipped && styles.chipSkipped]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: day.skipped }}
            accessibilityLabel={`Skip ${day.date}`}
            onPress={() => toggleSkippedDate(categoryId, day.date)}
          >
            <Text style={[styles.chipText, day.skipped && styles.chipTextSkipped]}>
              {formatWeekdayInitial(day.date)}
              {day.date.slice(8).replace(/^0/, '')}
            </Text>
            <Text style={[styles.chipState, day.skipped && styles.chipTextSkipped]}>
              {day.skipped ? 'skip' : 'count'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chipSkipped: {
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.border.light,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipState: {
    color: Colors.text.faint,
    fontSize: 9,
  },
  chipTextSkipped: {
    color: Colors.text.muted,
    textDecorationLine: 'line-through',
  },
});
