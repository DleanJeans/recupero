import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { useCustomCueOptions } from '../../../hooks/use-custom-cue-options';
import type { CheckInDay } from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { getMoodOption } from '../../../utils/cue-utils';

const DONE_FILL = '#3a2410';

interface CheckInCalendarProps {
  days: CheckInDay[];
}

/** Two weeks of days: filled when something was logged, with that day's last mood. */
export function CheckInCalendar({ days }: CheckInCalendarProps) {
  const custom = useCustomCueOptions();
  return (
    <View style={styles.grid}>
      {days.map(day => (
        <View
          key={day.date}
          style={[styles.cell, day.done && styles.done, day.isToday && styles.today]}
        >
          {day.done ? (
            <AppIcon
              value={day.lastMood ? getMoodOption(day.lastMood, custom.moods).emoji : '🔥'}
              size={15}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cell: {
    width: '12.5%',
    flexGrow: 1,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
  done: { backgroundColor: DONE_FILL },
  today: { borderWidth: 1, borderColor: Colors.star.filled },
});
