import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { LogEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import type { SleepEnergyScore } from '../../../utils/need-utils';
import { formatDuration } from '../../../utils/time-utils';

const STAGES = [
  { key: 'deepMinutes', label: 'Deep', color: Colors.sleepStage.deep },
  { key: 'remMinutes', label: 'REM', color: Colors.sleepStage.rem },
  { key: 'lightMinutes', label: 'Light', color: Colors.sleepStage.light },
  { key: 'awakeMinutes', label: 'Awake', color: Colors.sleepStage.awake },
] as const;

const formatMinutes = (minutes: number) => formatDuration(Math.round(minutes) * 60_000);

/** "+61%" next to the log's XP. */
export function SleepEnergyAmount({ score }: { score: SleepEnergyScore }) {
  return <Text style={styles.amount}>⚡ +{Math.round(score.amount)}%</Text>;
}

/** Sleep stage bar (when the wearable has stages) and the time asleep / quality working. */
export function SleepEnergyBreakdown({ log, score }: { log: LogEntry; score: SleepEnergyScore }) {
  const stages = STAGES.map(stage => ({ ...stage, minutes: log.sleep?.[stage.key] ?? 0 })).filter(
    stage => stage.minutes > 0,
  );
  return (
    <View style={styles.section}>
      {stages.length > 0 ? (
        <>
          <View style={styles.bar}>
            {stages.map(stage => (
              <View
                key={stage.key}
                style={[styles.barSegment, { flex: stage.minutes, backgroundColor: stage.color }]}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {stages.map(stage => (
              <View
                key={stage.key}
                style={styles.legendItem}
              >
                <View style={[styles.legendDot, { backgroundColor: stage.color }]} />
                <Text style={styles.legendText}>
                  {stage.label} <Text style={styles.legendValue}>{formatMinutes(stage.minutes)}</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.math}>
        <Text style={styles.mathValue}>{formatMinutes(score.asleepMinutes)}</Text>
        {log.sleep ? ' asleep' : ''}
        {score.restorativeShare != null ? (
          <>
            {' · deep + REM '}
            <Text style={styles.mathValue}>{Math.round(score.restorativeShare * 100)}%</Text>
          </>
        ) : (
          ' · no stage data'
        )}
        {' · quality '}
        <Text style={styles.factor}>×{score.factor.toFixed(2)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: Colors.energy,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  section: {
    gap: 7,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    gap: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    color: Colors.text.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  legendValue: {
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  math: {
    color: Colors.text.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  mathValue: {
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  factor: {
    color: Colors.energy,
    fontWeight: '600',
  },
});
