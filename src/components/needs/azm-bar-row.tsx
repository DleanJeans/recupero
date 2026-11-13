import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useHealthStore } from '../../store/health-store';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import { getAzmGoalDaysThisWeek, getAzmWeekTotal } from '../../utils/google-health-utils';
import { Text } from '../text';

const AZM_COLOR = '#f97316';

/** Cardio: today's Fitbit Active Zone Minutes against the daily goal, under the needs bars. Hidden until Fitbit is connected. */
export function AzmBarRow({ now }: { now: number }) {
  const connected = useHealthStore(state => state.tokens != null);
  const azmByDay = useHealthStore(state => state.azmByDay);
  const goal = useHealthStore(state => state.azmDailyGoal);
  if (!connected) return null;

  const minutes = azmByDay[toDateString(new Date(now))] ?? 0;
  const met = minutes >= goal;
  const color = met ? Colors.type.desirable : AZM_COLOR;
  const ratio = goal > 0 ? Math.min(1, minutes / goal) : 0;
  const week = getAzmWeekTotal(azmByDay, now);
  const daysMet = getAzmGoalDaysThisWeek(azmByDay, goal, now);

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Cardio ${minutes} of ${goal} Active Zone Minutes`}
    >
      <View style={styles.main}>
        <Text style={styles.emoji}>🫀</Text>
        <Text style={styles.label}>Cardio</Text>
        <View style={styles.track}>
          {minutes > 0 && (
            <View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }]} />
          )}
        </View>
        <Text style={[styles.value, { color: minutes > 0 ? color : Colors.text.faint }]}>{minutes}m</Text>
      </View>
      <Text
        style={styles.detail}
        numberOfLines={1}
      >
        {`Active Zone Minutes · of ${goal}${met ? ' ✓' : ''} · ${week} in 7 days · met ${daysMet} of 7`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 6,
    gap: 2,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  label: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    width: 64,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg.input,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  value: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.faint,
    fontSize: 11,
    marginLeft: 30,
  },
});
