import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '../store/settingsStore';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/dateUtils';
import { getEarnedStars, getLogCountForPeriod, getStarPeriod, getThresholds } from '../utils/starUtils';
import { Text } from './Text';

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
}

export function StarRow({
  behavior,
  dateStr,
  size = 13,
  color = Colors.star.filled,
  emptyColor = Colors.star.empty,
  style,
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

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`${earnedCount} of ${slots.length} stars earned`}
    >
      {slots.map(({ key, filled, threshold }) => (
        <StarSlot
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

interface StarSlotProps {
  filled: boolean;
  threshold: number | null;
  size: number;
  color: string;
  emptyColor: string;
}

/** Single star slot. Owns its own animation state so the pop + ring
 *  fire on a false→true transition without disturbing siblings. */
function StarSlot({ filled, threshold, size, color, emptyColor }: StarSlotProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  // null on first render so we can skip the pop on mount and only
  // animate on actual false→true transitions.
  const prevFilled = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevFilled.current === null) {
      // First mount: snap to final visible state, no animation.
      scale.value = 1;
      ringScale.value = 0.5;
      ringOpacity.value = 0;
    } else if (filled && !prevFilled.current) {
      // Empty → filled: pop the icon in with a spring and emit a
      // one-shot gold ring that expands and fades.
      scale.value = 0;
      scale.value = withSpring(1, {
        damping: 8,
        stiffness: 180,
        mass: 0.6,
      });
      ringScale.value = 0.5;
      ringScale.value = withTiming(2.0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      ringOpacity.value = withSequence(
        withTiming(0.7, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }),
      );
    } else if (!filled && prevFilled.current) {
      // Filled → empty: instant reset so the next fill can re-animate.
      scale.value = 1;
      ringScale.value = 0.5;
      ringOpacity.value = 0;
    }
    prevFilled.current = filled;
  }, [filled, scale, ringScale, ringOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <View style={styles.slot}>
      <Text
        style={[styles.threshold, { color: filled ? color : Colors.text.muted }]}
        accessibilityLabel={`${threshold} logs to earn`}
      >
        {threshold}
      </Text>
      <View style={[styles.iconWrap, { width: size, height: size }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, ringStyle]}
        />
        <Animated.View style={iconStyle}>
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? color : emptyColor}
            accessibilityLabel={threshold == null ? 'star tier skipped' : filled ? 'star earned' : 'star not earned'}
          />
        </Animated.View>
      </View>
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
    overflow: 'visible',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
});
