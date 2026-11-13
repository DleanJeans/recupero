import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useHealthStore } from '../../store/health-store';
import { Colors } from '../../utils/colors';
import { getAzmGoalDaysThisWeek, getAzmWeekTotal } from '../../utils/google-health-utils';
import { DailyGoalProgressBar } from '../daily-goal-progress-bar';
import { Text } from '../text';

interface AzmGoalCardProps {
  /** The day to show, "YYYY-MM-DD". */
  date: string;
}

/** Cardio: a day's Fitbit Active Zone Minutes against the daily goal, on the Daily screen. Hidden until Fitbit is connected. */
export function AzmGoalCard({ date }: AzmGoalCardProps) {
  const connected = useHealthStore(state => state.tokens != null);
  const azmByDay = useHealthStore(state => state.azmByDay);
  const goal = useHealthStore(state => state.azmDailyGoal);
  if (!connected) return null;

  const dayMs = new Date(`${date}T12:00:00`).getTime();
  const minutes = azmByDay[date] ?? 0;
  const met = minutes >= goal;
  const week = getAzmWeekTotal(azmByDay, dayMs);
  const daysMet = getAzmGoalDaysThisWeek(azmByDay, goal, dayMs);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>🫀</Text>
        <Text style={styles.label}>Cardio</Text>
        <Text style={[styles.value, met && styles.met]}>
          {minutes} / {goal} min
          {met ? ' ✓' : ''}
        </Text>
      </View>
      <DailyGoalProgressBar
        current={minutes}
        after={minutes}
        goal={goal}
      />
      <Text style={styles.detail}>
        Active Zone Minutes · {week} in the last 7 days · goal met {daysMet} of 7 days
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
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
