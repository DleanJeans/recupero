import React, { useMemo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSettingsStore } from '../store/settings-store';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/date-utils';
import { getEarnedStars, getLogCountForPeriod, getStarPeriod, getThresholds } from '../utils/star-utils';
import { AnimatedStarSlot } from './animated-star-slot';
import { StaticStarSlot } from './static-star-slot';

interface Props {
  /** Behavior whose earned stars to render. Behaviors without
   *  `starThresholds` render nothing. */
  behavior: BehaviorEntry;
  /** Anchor date (YYYY-MM-DD) — the period containing this date is
   *  evaluated. Defaults to today. */
  dateStr?: string;
  /** Icon size in pt. Default 13. */
  size?: number;
  /** Color for the filled glyphs. Default accent gold. */
  color?: string;
  /** Color for the empty glyphs. Default muted. */
  emptyColor?: string;
  /** Style for the outer container. */
  style?: StyleProp<ViewStyle>;
  motionEnabled?: boolean;
}

export function StarRow({
  behavior,
  dateStr,
  size = 13,
  color = Colors.star.filled,
  emptyColor = Colors.star.empty,
  style,
  motionEnabled = false,
}: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const thresholds = getThresholds(behavior);
  const todayStr = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour]);
  const targetDate = dateStr ?? todayStr;
  const earned = useMemo(() => {
    if (!thresholds) return 0;
    const logCount = getLogCountForPeriod(behavior, getStarPeriod(behavior), targetDate, dayCutoffHour);
    return getEarnedStars(logCount, thresholds);
  }, [behavior, dayCutoffHour, thresholds, targetDate]);

  if (!thresholds) return null;

  const slots: Array<{ key: number; filled: boolean; threshold: number | null }> = [];
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (t == null && !thresholds.slice(i + 1).some(x => x != null)) continue;
    slots.push({ key: i, filled: slots.length < earned, threshold: t });
  }
  const earnedCount = slots.filter(s => s.filled).length;
  const Slot = motionEnabled ? AnimatedStarSlot : StaticStarSlot;

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`${earnedCount} of ${slots.length} stars earned`}
    >
      {slots.map(({ key, filled, threshold }) => (
        <Slot
          key={key}
          filled={filled}
          threshold={threshold}
          size={size}
          color={color}
          emptyColor={emptyColor}
        />
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
});
