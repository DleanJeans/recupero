import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSunlight } from '../../hooks/use-sunlight';
import { Colors } from '../../utils/colors';
import { formatLux, getLightDoseTarget, getSunlightDay } from '../../utils/sunlight-utils';
import { DailyGoalProgressBar } from '../daily-goal-progress-bar';
import { Text } from '../text';

interface SunlightDayCardProps {
  /** The day to show, "YYYY-MM-DD". */
  date: string;
}

/** A day's sunlight minutes against the goal, plus its light dose, on the Daily screen. Hidden when Sunlight is off. */
export function SunlightDayCard({ date }: SunlightDayCardProps) {
  const sunlight = useSunlight();
  const { ranges, point, weather, now, goalMinutes } = sunlight;
  const day = useMemo(
    () => getSunlightDay(new Date(`${date}T00:00:00`).getTime(), ranges, point, weather, now),
    [date, now, point, ranges, weather],
  );
  if (!sunlight.enabled) return null;

  const met = day.minutes >= goalMinutes;
  const dose = Math.floor(day.luxMinutes).toLocaleString('en-US');
  const target = getLightDoseTarget(goalMinutes).toLocaleString('en-US');

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>☀️</Text>
        <Text style={styles.label}>Sunlight</Text>
        <Text style={[styles.value, met && styles.met]}>
          {day.minutes} / {goalMinutes} min
          {met ? ' ✓' : ''}
        </Text>
      </View>
      <DailyGoalProgressBar
        current={day.minutes}
        after={day.minutes}
        goal={goalMinutes}
      />
      <Text style={styles.detail}>
        Light dose {dose} / {target} lux·min
        {day.lux != null ? ` · ${formatLux(day.lux)} avg` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 16 },
  label: { flex: 1, color: Colors.text.secondary, fontSize: 14 },
  value: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  met: { color: Colors.type.desirable },
  detail: { color: Colors.text.faint, fontSize: 12 },
});
