import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useHealthStore } from '../../store/health-store';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import { getAzmGoalDaysThisWeek, getAzmWeekTotal } from '../../utils/google-health-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { DailyGoalProgressBar } from '../daily-goal-progress-bar';
import { Text } from '../text';

/** Today's Fitbit Active Zone Minutes against the daily goal, under the Needs panel. Hidden until Fitbit is connected. */
export function AzmGoalCard() {
  const connected = useHealthStore(state => state.tokens != null);
  const azmByDay = useHealthStore(state => state.azmByDay);
  const goal = useHealthStore(state => state.azmDailyGoal);
  if (!connected) return null;

  const now = Date.now();
  const today = azmByDay[toDateString(new Date(now))] ?? 0;
  const met = today >= goal;
  const week = getAzmWeekTotal(azmByDay, now);
  const daysMet = getAzmGoalDaysThisWeek(azmByDay, goal, now);

  return (
    <View style={styles.group}>
      <CueSectionLabel>Active Zone Minutes</CueSectionLabel>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.label}>Today</Text>
          <Text style={[styles.value, met && styles.met]}>
            {today} / {goal}
            {met ? ' ✓' : ''}
          </Text>
        </View>
        <DailyGoalProgressBar
          current={today}
          after={today}
          goal={goal}
        />
        <Text style={styles.detail}>
          {week} this week · goal met {daysMet} of 7 days
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  card: {
    backgroundColor: Colors.bg.card,
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
