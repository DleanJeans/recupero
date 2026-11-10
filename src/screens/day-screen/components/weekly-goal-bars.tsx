import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatWeekdayInitial } from '../../../utils/weekly-goal-format';
import type { WeeklyGoalSummary } from '../../../utils/weekly-goal-utils';

interface WeeklyGoalBarsProps {
  summary: WeeklyGoalSummary;
  selectedDate: string;
  onSelectDay: (date: string) => void;
}

const PLOT_HEIGHT = 74;
const LABEL_ROOM = 14;
const AVERAGE_COLOR = Colors.metadataBar[0];

function GoalLine({ bottom }: { bottom: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.goalLine, { bottom }]}
    >
      <View style={styles.goalDashes} />
    </View>
  );
}

export function WeeklyGoalBars({ summary, selectedDate, onSelectDay }: WeeklyGoalBarsProps) {
  const max = Math.max(summary.goal, summary.average, ...summary.days.map(day => day.value), 1);
  const toHeight = (value: number) => (value / max) * PLOT_HEIGHT;

  return (
    <View>
      <View style={styles.plot}>
        {summary.days.map(day => {
          const height = toHeight(day.value);
          const over = day.value > summary.goal;
          return (
            <Pressable
              key={day.date}
              style={styles.column}
              accessibilityRole="button"
              accessibilityLabel={`${day.date}: ${day.value} of ${summary.goal} ${summary.unit ?? ''}${
                day.partial ? ', today so far' : ''
              }`}
              onPress={() => onSelectDay(day.date)}
            >
              {day.value > 0 && (
                <Text
                  style={[styles.valueLabel, { bottom: height + 2 }]}
                  numberOfLines={1}
                >
                  {Math.round(day.value).toLocaleString('en-US')}
                </Text>
              )}
              <View
                style={[
                  styles.bar,
                  { height },
                  { backgroundColor: over ? Colors.star.filled : Colors.type.desirable },
                  day.partial && styles.partialBar,
                ]}
              />
            </Pressable>
          );
        })}
        <GoalLine bottom={toHeight(summary.goal)} />
        <View
          pointerEvents="none"
          style={[styles.averageLine, { bottom: toHeight(summary.average) }]}
        />
      </View>
      <View style={styles.labels}>
        {summary.days.map(day => (
          <Text
            key={day.date}
            style={[styles.dayLabel, day.date === selectedDate && styles.selectedDayLabel]}
          >
            {formatWeekdayInitial(day.date)}
            {day.date.slice(8).replace(/^0/, '')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: PLOT_HEIGHT + LABEL_ROOM,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '78%',
    borderRadius: 4,
    minHeight: 2,
  },
  partialBar: {
    opacity: 0.4,
  },
  valueLabel: {
    position: 'absolute',
    color: Colors.text.light,
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    overflow: 'hidden',
  },
  goalDashes: {
    height: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.text.light,
    borderRadius: 1,
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: AVERAGE_COLOR,
  },
  labels: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '600',
  },
  selectedDayLabel: {
    color: Colors.text.primary,
  },
});
