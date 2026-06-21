import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import type { BehaviorEntry, BehaviorType } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behaviorTypeUtils';
import { Colors } from '../utils/colors';
import { getTimeUntilNextDecay } from '../utils/xpUtils';
import { Text } from './Text';

interface Props {
  behavior: BehaviorEntry;
}

/** Decay color reflects whether decay is "good" or "bad" for the behavior type:
 *  red for desirable (decay hurts progress), green for undesirable (decay helps),
 *  neutral type color for neutral behaviors. */
const DECAY_COLOR: Record<BehaviorType, string> = {
  desirable: Colors.cooldown.red,
  undesirable: Colors.cooldown.green,
  neutral: getBehaviorTypeColor('neutral'),
};

/** Translucent stripe + transparent gap. */
const STRIPE_COLOR = 'rgba(255, 255, 255, 0.28)';
const STRIPE_GAP_COLOR = 'rgba(255, 255, 255, 0)';

/** One stripe + one gap in pixels. The gradient repeats this period; the
 *  animation translates by exactly one period for a seamless loop. */
const STRIPE_PERIOD = 10;
const STRIPE_LOOP_DURATION_MS = 1000;

/** Gradient is a square sized to the widest possible bar (screen width) plus
 *  one stripe period, rounded up to an integer number of periods so the
 *  pattern tiles cleanly across the full gradient. Height equals width to
 *  give true 45° stripes via start=(0,0) → end=(1,1). */
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRADIENT_SIZE = Math.ceil((SCREEN_WIDTH + STRIPE_PERIOD) / STRIPE_PERIOD) * STRIPE_PERIOD;
const N_PERIODS = GRADIENT_SIZE / STRIPE_PERIOD;

/** Build the colors/locations arrays that produce a diagonal stripe pattern in
 *  a single `LinearGradient`. Each period is half-stripe, half-gap with hard
 *  transitions (location i === location i+1). */
function buildStripePattern(periods: number): {
  colors: string[];
  locations: number[];
} {
  const colors: string[] = [];
  const locations: number[] = [];
  const stripeFraction = 0.5 / periods; // half of each period is the stripe
  for (let i = 0; i < periods; i++) {
    const start = i / periods;
    const stripeEnd = start + stripeFraction;
    const periodEnd = (i + 1) / periods;
    colors.push(STRIPE_COLOR);
    locations.push(start);
    colors.push(STRIPE_COLOR);
    locations.push(stripeEnd);
    colors.push(STRIPE_GAP_COLOR);
    locations.push(stripeEnd);
    colors.push(STRIPE_GAP_COLOR);
    locations.push(periodEnd);
  }
  return { colors, locations };
}

function unitLabel(every: number, unit: 'days' | 'weeks' | 'months'): string {
  if (unit === 'days') return `${every}d`;
  if (unit === 'weeks') return `${every}w`;
  return `${every}mo`;
}

export function DecayBar({ behavior }: Props) {
  const decay = getTimeUntilNextDecay(behavior);
  if (!decay) return null;
  const { daysLeft, everyDays, every, unit } = decay;
  const isUndesirable = behavior.type === 'undesirable';
  // For desirable/neutral: bar empties as we approach decay (time remaining).
  // For undesirable: decay is a reward, so invert — bar fills as we approach it.
  const ratio = isUndesirable ? 1 - daysLeft / everyDays : daysLeft / everyDays;
  const color = DECAY_COLOR[behavior.type ?? 'neutral'];
  const stripePattern = useMemo(() => buildStripePattern(N_PERIODS), []);

  // Direction multiplier: Desirable scrolls left (negative), Undesirable right
  // (positive). Driving direction via the animation's toValue (not a
  // `scaleX: -1` transform) keeps the wrapper transform single-axis, which
  // is what the native driver animates most cleanly.
  const direction = isUndesirable ? 1 : -1;
  const movedWidth = direction * STRIPE_PERIOD * 2;
  const translateX = useRef(new Animated.Value(isUndesirable ? -movedWidth : 0)).current;
  const animateTo = isUndesirable ? 0 : movedWidth;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: animateTo,
        duration: STRIPE_LOOP_DURATION_MS,
        // Easing.linear is critical: the default Easing.ease decelerates at
        // every loop boundary, which reads as a visible stutter.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX, direction]);

  return (
    <View style={styles.row}>
      <Ionicons
        name="hourglass-outline"
        size={12}
        color={color}
      />
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
        <View
          pointerEvents="none"
          style={[styles.stripeOverlay, { width: `${ratio * 100}%` }]}
        >
          <Animated.View style={{ transform: [{ translateX }] }}>
            <LinearGradient
              colors={stripePattern.colors as unknown as readonly [string, string, ...string[]]}
              locations={stripePattern.locations as unknown as readonly [number, number, ...number[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: GRADIENT_SIZE, height: GRADIENT_SIZE }}
            />
          </Animated.View>
        </View>
      </View>
      <Text style={styles.label}>{unitLabel(every, unit)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  track: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
  },
  stripeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
