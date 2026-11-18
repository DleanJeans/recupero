import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CheckInDay } from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { Text } from '../../text';

const STREAK_FILL = '#3a2410';
const STREAK_ACCENT = '#fb923c';

interface CheckInWeekStripProps {
  days: CheckInDay[];
}

/** One pill per day: a flame when something was logged, a dashed "?" for today while it is still open. */
export function CheckInWeekStrip({ days }: CheckInWeekStripProps) {
  return (
    <View style={styles.row}>
      {days.map(day => (
        <View
          key={day.date}
          style={styles.cell}
        >
          <View style={[styles.pill, day.done && styles.done, day.isToday && !day.done && styles.today]}>
            <Text style={[styles.glyph, day.isToday && !day.done && styles.todayGlyph]}>
              {day.done ? '🔥' : day.isToday ? '?' : ''}
            </Text>
          </View>
          <Text style={styles.label}>{day.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cell: { flex: 1, alignItems: 'center', gap: 3 },
  pill: {
    width: '78%',
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  done: { backgroundColor: STREAK_FILL },
  today: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: STREAK_ACCENT },
  glyph: { fontSize: 11 },
  todayGlyph: { color: STREAK_ACCENT, fontWeight: '800' },
  label: { color: Colors.text.faint, fontSize: 9 },
});
