import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CalendarProps } from 'react-native-calendars';
import type { CalendarDayMetric, CalendarDayMetricType } from '../utils/calendar-metrics';
import { Colors } from '../utils/colors';
import { Text } from './text';

type CalendarDayComponentProps = React.ComponentProps<NonNullable<CalendarProps['dayComponent']>>;

export interface CalendarMetricDayProps extends CalendarDayComponentProps {
  metric?: CalendarDayMetric;
  metricType?: CalendarDayMetricType;
}

export function CalendarMetricDay({ date, state, marking, metric, metricType, onPress }: CalendarMetricDayProps) {
  const selected = marking?.selected === true;
  const disabled = state === 'disabled' || state === 'inactive';
  const shouldReserveMetricRow = metricType != null;
  const dayTextColor = selected ? Colors.bg.black : disabled ? Colors.text.dim : Colors.text.primary;
  const metricTextColor = selected
    ? Colors.bg.black
    : metric?.type === 'tasks'
      ? Colors.status.successLight
      : Colors.star.filled;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress?.(date)}
      style={[styles.calendarDay, selected && styles.calendarDaySelected, state === 'today' && styles.calendarDayToday]}
      accessibilityLabel={date ? `${date.dateString}${metric ? `, ${metric.value} ${metric.type}` : ''}` : undefined}
    >
      <Text style={[styles.calendarDayText, { color: dayTextColor }]}>{date?.day}</Text>
      {shouldReserveMetricRow && (
        <View style={styles.calendarMetricRow}>
          {metric?.type === 'stars' && metric.value > 0 && (
            <Ionicons
              name="star"
              size={10}
              color={metricTextColor}
            />
          )}
          {metric?.type === 'tasks' && metric.value > 0 && (
            <Ionicons
              name="checkmark"
              size={10}
              color={metricTextColor}
            />
          )}
          {metric && <Text style={[styles.calendarMetricText, { color: metricTextColor }]}>{metric.value}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  calendarDay: {
    width: 36,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 10,
  },
  calendarDaySelected: {
    backgroundColor: Colors.text.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  calendarMetricRow: {
    minHeight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  calendarMetricText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    fontVariant: ['tabular-nums'],
  },
});
