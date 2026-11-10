import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useScreenUiStore } from '../../../store/screen-ui-store';
import { Colors } from '../../../utils/colors';
import { formatGoalNumber, formatSignedNumber } from '../../../utils/weekly-goal-format';
import { WEEKLY_GOAL_DAYS, type WeeklyGoalSummary } from '../../../utils/weekly-goal-utils';
import { WeeklyGoalBars } from './weekly-goal-bars';

interface WeeklyGoalCardProps {
  summary: WeeklyGoalSummary;
  selectedDate: string;
}

const AVERAGE_COLOR = Colors.metadataBar[0];

export function WeeklyGoalCard({ summary, selectedDate }: WeeklyGoalCardProps) {
  const setSelectedDate = useScreenUiStore(s => s.setDayScreenSelectedDate);
  const setRange = useScreenUiStore(s => s.setDayScreenMetadataRange);
  const unit = summary.unit ? ` ${summary.unit}` : '';
  // Without a per-goal direction setting, within 10% of goal counts as a hit.
  const hit = Math.abs(summary.percent - 100) <= 10;

  const openDay = (date: string) => {
    setSelectedDate(date);
    setRange('day');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text
          style={styles.label}
          numberOfLines={1}
        >
          {summary.label}
        </Text>
        <Text
          selectable
          style={styles.average}
        >
          {summary.countedDays > 0 ? formatGoalNumber(summary.average) : '\u2014'}
          <Text style={styles.averageGoal}>
            {' '}
            avg /{formatGoalNumber(summary.goal)}
            {unit}
          </Text>
        </Text>
      </View>
      <WeeklyGoalBars
        summary={summary}
        selectedDate={selectedDate}
        onSelectDay={openDay}
      />
      <View style={styles.footer}>
        {summary.countedDays > 0 ? (
          <>
            <Text style={styles.footerText}>
              Avg is{' '}
              <Text style={[styles.footerStrong, { color: hit ? Colors.type.desirable : Colors.star.filled }]}>
                {summary.percent}%
              </Text>{' '}
              of goal{summary.countedDays < WEEKLY_GOAL_DAYS ? ` \u00b7 ${summary.countedDays} days` : ''}
            </Text>
            <Text style={styles.footerText}>
              Net <Text style={styles.footerStrong}>{formatSignedNumber(summary.net)}</Text> vs{' '}
              {formatGoalNumber(summary.weekGoal)}
            </Text>
          </>
        ) : (
          <Text style={styles.footerText}>No days counted. Every day is skipped or still in progress.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  average: {
    color: AVERAGE_COLOR,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  averageGoal: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerText: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  footerStrong: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
