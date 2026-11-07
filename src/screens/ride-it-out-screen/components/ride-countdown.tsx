import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { CravingLog } from '../../../types/craving';
import { Colors } from '../../../utils/colors';
import type { CravingTone } from '../../../utils/craving-tone';
import { formatStopwatchDuration } from '../../../utils/stopwatch-utils';

const MAX_BARS = 12;

interface RideCountdownProps {
  craving: CravingLog;
  remainingMs: number;
  tone: CravingTone;
}

/** Countdown circle with the urge ratings so far drawn as bars beside it. */
export function RideCountdown({ craving, remainingMs, tone }: RideCountdownProps) {
  const progress = craving.rideMs > 0 ? 1 - remainingMs / craving.rideMs : 1;
  const bars = craving.ratings.slice(-MAX_BARS);

  return (
    <View style={styles.row}>
      <View style={styles.circle}>
        <Text style={styles.time}>{formatStopwatchDuration(remainingMs)}</Text>
        <Text style={styles.caption}>left of {formatStopwatchDuration(craving.rideMs)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tone.accent }]} />
        </View>
      </View>
      <View style={styles.chart}>
        <Text style={styles.chartLabel}>{tone.urgeChartLabel}</Text>
        <View style={styles.bars}>
          {bars.length === 0 ? (
            <Text style={styles.empty}>Rate it below as it changes.</Text>
          ) : (
            bars.map((rating, index) => (
              <View
                key={rating.ts}
                style={[
                  styles.bar,
                  {
                    height: `${rating.level * 20}%`,
                    backgroundColor: index === bars.length - 1 ? tone.accent : tone.accentDim,
                  },
                ]}
              />
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  time: { color: Colors.text.primary, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  caption: { color: Colors.text.muted, fontSize: 11 },
  track: {
    width: 76,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.bg.input,
    marginTop: 6,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  chart: { flex: 1, gap: 8 },
  chartLabel: { color: Colors.text.faint, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  bars: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: {
    flex: 1,
    maxWidth: 28,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  empty: { color: Colors.text.faint, fontSize: 12, alignSelf: 'center' },
});
