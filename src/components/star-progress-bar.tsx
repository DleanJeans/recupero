import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../store/settings-store';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import {
  getEarnedStars,
  getLogCountForPeriod,
  getNextStarThreshold,
  getStarPeriod,
  getStarProgressLabel,
  getStarProgressSegments,
  getThresholds,
} from '../utils/star-utils';
import { Text } from './text';

/** Width of the row label column. The home card passes the same width to
 *  the XP bar's level label so both bars line up, with room after "Today". */
export const STAR_PROGRESS_LABEL_WIDTH = 40;

interface Props {
  behavior: BehaviorEntry;
  /** Anchor date (YYYY-MM-DD) whose star period is evaluated. */
  dateStr: string;
  todayStr: string;
}

/** Segmented "Today" bar that sits under the XP bar on the home card:
 *  one segment per star threshold, with the threshold count above each
 *  segment's end. Renders nothing for behaviors without thresholds. */
export function StarProgressBar({ behavior, dateStr, todayStr }: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const thresholds = getThresholds(behavior);
  const period = getStarPeriod(behavior);
  const logCount = useMemo(
    () => getLogCountForPeriod(behavior, period, dateStr, dayCutoffHour),
    [behavior, period, dateStr, dayCutoffHour],
  );
  const segments = useMemo(
    () => (thresholds ? getStarProgressSegments(logCount, thresholds) : []),
    [logCount, thresholds],
  );

  if (!thresholds || segments.length === 0) return null;

  const next = getNextStarThreshold(logCount, thresholds);
  const label = getStarProgressLabel(period, dateStr, todayStr);
  const earned = getEarnedStars(logCount, thresholds);
  // Leading nulls are placeholder stars (see getEarnedStars); trailing nulls are dropped.
  const starCount = thresholds.reduce<number>((n, t, i) => (t != null ? i + 1 : n), 0);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${logCount} of ${next} logs, ${earned} of ${starCount} stars earned`}
    >
      <View style={styles.row}>
        <View style={styles.labelSpacer} />
        <View style={styles.segments}>
          {segments.map((segment, i) => (
            <Text
              key={i}
              style={[styles.mark, { flex: segment.span }, segment.hit && styles.markHit]}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          ))}
        </View>
        <View style={styles.valueSpacer} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.segments}>
          {segments.map((segment, i) => (
            <View
              key={i}
              style={[styles.track, { flex: segment.span }]}
            >
              <View style={[styles.fill, { width: `${segment.fill * 100}%` }]} />
            </View>
          ))}
        </View>
        <Text style={styles.value}>
          {logCount}/{next}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelSpacer: {
    width: STAR_PROGRESS_LABEL_WIDTH,
  },
  valueSpacer: {
    minWidth: 42,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    width: STAR_PROGRESS_LABEL_WIDTH,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  mark: {
    minWidth: 0,
    color: Colors.text.faint,
    fontSize: 9,
    lineHeight: 11,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  markHit: {
    color: Colors.star.filled,
    fontWeight: '700',
  },
  track: {
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.star.filled,
  },
  value: {
    color: Colors.text.faint,
    fontSize: 10,
    minWidth: 42,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
