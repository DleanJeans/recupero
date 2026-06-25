import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../utils/colors';
import { getLevel, getLevelProgress, getLevelXp, getXp, getXpToNextLevel } from '../utils/xpUtils';
import { Text } from './Text';

interface XpBarProps {
  logCount: number;
  color?: string;
  /** When true, animate fill on logCount change. Deferred to when screen is focused. */
  animate?: boolean;
}

export function XpBar({ logCount, color = Colors.type.neutral, animate = false }: XpBarProps) {
  const xp = getXp(logCount);
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const curXp = getLevelXp(xp);
  const nextXp = getXpToNextLevel(xp);

  const animatedProgress = useSharedValue(progress);
  const prevLevel = useRef(level);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      animatedProgress.value = withSpring(progress, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      });
    } else {
      animatedProgress.value = progress;
    }

    if (animate && level > prevLevel.current) {
      glowOpacity.value = withSequence(withTiming(0.6, { duration: 180 }), withTiming(0, { duration: 500 }));
    }
    prevLevel.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, logCount]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Lv{level}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
        <Animated.View style={[styles.glow, { backgroundColor: color }, glowStyle]} />
      </View>
      <Text style={styles.value}>
        {curXp}/{curXp + nextXp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 30,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  glow: {
    position: 'absolute',
    left: 0,
    top: -2,
    height: 8,
    borderRadius: 4,
  },
  value: {
    color: Colors.text.faint,
    fontSize: 10,
    minWidth: 42,
    textAlign: 'right',
  },
});
