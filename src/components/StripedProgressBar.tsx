import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../utils/colors';

interface Props {
  /** 0 to 1. Clamped before rendering. */
  ratio: number;
  /** Fill color (also drives the stripe tinting via overlay alpha). */
  color: string;
  /** Stripe scroll direction. -1 = right-to-left, 1 = left-to-right. */
  direction?: -1 | 1;
  /** Track height in pixels. */
  height?: number;
}

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

/** Spring config for the ratio → width transition. Matches XpBar so all
 *  animated bars in the summary feel consistent when they move together. */
const RATIO_SPRING = { damping: 18, stiffness: 120, mass: 0.8 } as const;

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

/** Animated progress bar: solid fill clipped to `ratio` width, with a
 *  diagonally-striped overlay that scrolls continuously to signal an
 *  ongoing process. Used as the visual base for both DecayBar and CooldownBar. */
export function StripedProgressBar({ ratio, color, direction = -1, height = 3 }: Props) {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  // Stripes signal an ongoing process; skip the overlay (and its native-loop
  // animation) once the bar is full — the solid fill already says "done".
  const showStripes = safeRatio < 1;
  const stripePattern = useMemo(() => buildStripePattern(N_PERIODS), []);

  // Smoothly transition width when the prop changes (e.g., a fresh log
  // resets cooldown ratio from ~1 down to a small value). Springs match
  // XpBar so the summary feels coherent when several bars move together.
  const animatedRatio = useSharedValue(safeRatio);
  useEffect(() => {
    animatedRatio.value = withSpring(safeRatio, RATIO_SPRING);
  }, [safeRatio, animatedRatio]);

  // Direction multiplier: 1 scrolls left-to-right, -1 right-to-left.
  // Driving direction via the animation's toValue (not a `scaleX: -1`
  // transform) keeps the wrapper transform single-axis, which the native
  // driver animates most cleanly.
  const movedWidth = direction * STRIPE_PERIOD * 2;
  const translateX = useSharedValue(direction > 0 ? -movedWidth : 0);
  const animateTo = direction > 0 ? 0 : movedWidth;

  useEffect(() => {
    if (!showStripes) {
      cancelAnimation(translateX);
      return;
    }
    // Reset to the start of the period before each repeat so the loop
    // boundary is invisible (the gradient is periodic in STRIPE_PERIOD * 2).
    translateX.value = direction > 0 ? -movedWidth : 0;
    translateX.value = withRepeat(
      withTiming(animateTo, {
        duration: STRIPE_LOOP_DURATION_MS,
        // Easing.linear is critical: any non-linear easing decelerates at
        // every loop boundary, which reads as a visible stutter.
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
  }, [showStripes, animateTo, direction, movedWidth, translateX]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedRatio.value * 100}%`,
  }));
  const stripeOverlayStyle = useAnimatedStyle(() => ({
    width: `${animatedRatio.value * 100}%`,
  }));
  const stripeTransformStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      {showStripes && (
        <Animated.View
          pointerEvents="none"
          style={[styles.stripeOverlay, stripeOverlayStyle]}
        >
          <Animated.View style={stripeTransformStyle}>
            <LinearGradient
              colors={stripePattern.colors as unknown as readonly [string, string, ...string[]]}
              locations={stripePattern.locations as unknown as readonly [number, number, ...number[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: GRADIENT_SIZE, height: GRADIENT_SIZE }}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  stripeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
