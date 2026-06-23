import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/dateUtils';
import { getEarnedStars, getLogsForDate, getThresholds } from '../utils/starUtils';
import { Text } from './Text';

interface Props {
  /** Behavior whose daily earned stars to render. Behaviors without
   *  `starThresholds` render nothing. */
  behavior: BehaviorEntry;
  /** Date string (YYYY-MM-DD) for the day to evaluate. Defaults to today. */
  dateStr?: string;
  /** Icon size in pt. Default 13. */
  size?: number;
  /** Color for the filled glyphs. Default accent gold. */
  color?: string;
  /** Color for the empty glyphs. Default muted. */
  emptyColor?: string;
  /** Slot count. Default 3. */
  count?: number;
  /** Style for the outer container. */
  style?: StyleProp<ViewStyle>;
}

export function StarRow({
  behavior,
  dateStr,
  size = 13,
  color = Colors.star.filled,
  emptyColor = Colors.star.empty,
  count = 3,
  style,
}: Props) {
  const thresholds = getThresholds(behavior);
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const targetDate = dateStr ?? todayStr;
  const earned = useMemo(() => {
    if (!thresholds) return 0;
    const logCount = getLogsForDate(behavior, targetDate).length;
    return getEarnedStars(logCount, thresholds);
  }, [behavior, thresholds, targetDate]);

  if (!thresholds) return null;
  const clamped = Math.max(0, Math.min(earned, count));
  const slots = Array.from({ length: count }, (_, i) => ({
    filled: i < clamped,
    threshold: thresholds[i],
  }));
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`${clamped} of ${count} stars earned`}
    >
      {slots.map(({ filled, threshold }, i) => (
        <View
          key={i}
          style={styles.slot}
        >
          {threshold != null && (
            <Text
              style={[styles.threshold, { color: filled ? color : Colors.text.muted }]}
              accessibilityLabel={`${threshold} logs to earn`}
            >
              {threshold}
            </Text>
          )}
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? color : emptyColor}
            accessibilityLabel={filled ? 'star earned' : 'star not earned'}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  threshold: {
    fontSize: 10,
    fontWeight: '600',
  },
  slot: {
    alignItems: 'center',
  },
});
