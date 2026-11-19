import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition } from 'react-native-reanimated';
import { useBehaviorStore } from '../store/behavior-store';
import { useSettingsStore } from '../store/settings-store';
import type { TimerSession } from '../store/timer-store';
import { Colors } from '../utils/colors';
import { formatStopwatchDuration } from '../utils/stopwatch-utils';
import { getTimerLevelProgress } from '../utils/timer-utils';
import { getEffectiveXp, getTimerXp } from '../utils/xp-utils';
import { BehaviorIcon } from './behavior-icon';
import { ProgressRing } from './progress-ring';
import { Text } from './text';

interface TimerPillProps {
  session: TimerSession;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Small chip (level ring around the icon + time), e.g. while the Routines list is scrolled down. */
  compact?: boolean;
}

// Same duration and easing as DockingPills' slide, so x/y/size all move on one curve (no clock-like arc).
export const PILL_LAYOUT = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));

/**
 * One timer's pill: green while running, grey when paused or waiting to be logged.
 * Full: icon circle, name and time, then the behavior's level XP filling live underneath.
 * Compact: the level shown as a ring around the icon, next to the time.
 */
export function TimerPill({ session, onPress, style, compact = false }: TimerPillProps) {
  const { lockedBehaviorId, startTimestamp, stopTimestamp, pausedAt } = session;
  const behavior = useBehaviorStore(s => s.behaviors.find(b => b.id === lockedBehaviorId));
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const isRunning = startTimestamp != null && stopTimestamp == null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const isPaused = pausedAt != null && startTimestamp == null;
  if ((startTimestamp == null && !isPaused) || behavior == null) return null;

  const elapsedMs = startTimestamp == null ? 0 : Math.max(0, (stopTimestamp ?? now) - startTimestamp);
  const elapsed = startTimestamp == null ? 'paused' : formatStopwatchDuration(elapsedMs);
  const hint = isRunning ? undefined : isPaused ? 'Tap to resume' : 'Tap to log';
  // Logged segments are already in the behavior's XP; only the one on the clock is added on top.
  const level = behavior.xpEnabled
    ? getTimerLevelProgress(getEffectiveXp(behavior, now, dayCutoffHour), getTimerXp(elapsedMs))
    : undefined;
  const textColor = isRunning ? Colors.typeText.desirable : Colors.text.secondary;
  const icon = (
    <BehaviorIcon
      behavior={behavior}
      size={compact ? 20 : 14}
    />
  );

  return (
    <Animated.View
      style={[styles.wrap, style]}
      pointerEvents="box-none"
      layout={PILL_LAYOUT}
    >
      <Pressable
        style={({ pressed }) => [
          compact ? styles.chip : styles.pill,
          !isRunning && styles.pillStopped,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open timer for ${behavior.name}, ${elapsed}${hint ? `, ${hint}` : ''}`}
      >
        {compact ? (
          <Animated.View
            key="compact"
            style={styles.row}
            entering={FadeIn.duration(180)}
          >
            {level ? (
              <ProgressRing
                share={level.now}
                size={40}
                thickness={4}
                color={isRunning ? Colors.type.desirable : Colors.text.secondary}
              >
                {icon}
              </ProgressRing>
            ) : (
              <View style={[styles.iconCircle, !isRunning && styles.iconCircleStopped]}>{icon}</View>
            )}
            {isPaused && (
              <Ionicons
                name="pause"
                size={13}
                color={textColor}
              />
            )}
            <Text
              style={[styles.time, styles.timeChip, { color: textColor }]}
              numberOfLines={1}
            >
              {elapsed}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            key="full"
            style={styles.full}
            entering={FadeIn.duration(180)}
          >
            <View style={styles.row}>
              <View style={[styles.iconCircle, !isRunning && styles.iconCircleStopped]}>{icon}</View>
              {isPaused && (
                <Ionicons
                  name="pause"
                  size={13}
                  color={textColor}
                />
              )}
              <Text
                style={[styles.name, { color: textColor }]}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
              <Text
                style={[styles.time, { color: textColor }]}
                numberOfLines={1}
              >
                {elapsed}
              </Text>
            </View>
            {hint ? (
              <Text
                style={[styles.sub, { color: textColor }]}
                numberOfLines={1}
              >
                {hint}
              </Text>
            ) : level ? (
              <View style={styles.levelRow}>
                <Text
                  style={[styles.sub, { color: textColor }]}
                  numberOfLines={1}
                >
                  Lv{level.level}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(level.now * 100)}%` }]} />
                </View>
                <Text
                  style={[styles.sub, styles.subValue, { color: textColor }]}
                  numberOfLines={1}
                >
                  {Math.floor(level.xpInLevel)}/{level.xpForLevel}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 0,
  },
  pill: {
    minWidth: 240,
    maxWidth: '86%',
    borderRadius: 18,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 7,
    backgroundColor: Colors.typeBtn.desirable,
  },
  chip: {
    borderRadius: 999,
    paddingLeft: 3,
    paddingRight: 12,
    paddingVertical: 3,
    backgroundColor: Colors.typeBtn.desirable,
  },
  pillStopped: { backgroundColor: Colors.bg.elevated },
  pressed: { opacity: 0.8 },
  full: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // The behavior's icon in a circle, at the pill's left edge.
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  ringDisc: { width: 22, height: 22, borderRadius: 11 },
  iconCircleStopped: { opacity: 0.6 },
  // The name gives way first, so the time (1:05:12) is never cut off.
  name: { fontSize: 13, fontWeight: '600', flexShrink: 1, flexGrow: 1 },
  time: { fontSize: 13, fontWeight: '600', flexShrink: 0, fontVariant: ['tabular-nums'] },
  timeChip: { fontSize: 17, fontWeight: '700' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 3 },
  sub: { fontSize: 11, fontWeight: '500', opacity: 0.85, flexShrink: 0 },
  subValue: { minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Colors.type.desirable },
});
