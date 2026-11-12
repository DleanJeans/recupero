import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SunlightDay } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const CHART_HEIGHT = 72;

interface SunlightWeekChartProps {
  /** Today first. */
  days: SunlightDay[];
  goalMinutes: number;
}

/** One bar per day for the past week, oldest on the left, with a line at the goal. */
export function SunlightWeekChart({ days, goalMinutes }: SunlightWeekChartProps) {
  const ordered = [...days].reverse();
  const max = Math.max(goalMinutes * 1.25, ...ordered.map(day => day.minutes));
  const goalBottom = (goalMinutes / max) * CHART_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        <View style={[styles.goalLine, { bottom: goalBottom }]} />
        {ordered.map(day => {
          const height = day.minutes > 0 ? Math.max(3, (day.minutes / max) * CHART_HEIGHT) : 0;
          const color = day.minutes >= goalMinutes ? Colors.type.desirable : SUNLIGHT_COLOR;
          return (
            <View
              key={day.dayStart}
              style={styles.column}
            >
              <Text style={styles.minutes}>{day.minutes > 0 ? day.minutes : ''}</Text>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {ordered.map((day, index) => (
          <Text
            key={day.dayStart}
            style={[styles.label, index === ordered.length - 1 && styles.today]}
          >
            {index === ordered.length - 1
              ? 'Today'
              : new Date(day.dayStart).toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  chart: {
    height: CHART_HEIGHT + 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  minutes: {
    color: Colors.text.muted,
    fontSize: 10,
    marginBottom: 2,
  },
  bar: {
    width: '70%',
    borderRadius: 3,
  },
  labels: {
    flexDirection: 'row',
    gap: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text.faint,
    fontSize: 10,
  },
  today: {
    color: Colors.text.light,
    fontWeight: '700',
  },
});
