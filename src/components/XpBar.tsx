import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAnimatedXpNumbers } from '../hooks/useAnimatedXpNumbers';
import { Colors } from '../utils/colors';
import { getLevel, getLevelProgress, getLevelXp, getXp, getXpToNextLevel } from '../utils/xpUtils';
import { Text } from './Text';

interface XpBarProps {
  logCount: number;
  color?: string;
  animateNumbers?: boolean;
}

export function XpBar({ logCount, color = Colors.type.neutral, animateNumbers = false }: XpBarProps) {
  const xp = getXp(logCount);
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const currentXp = getLevelXp(xp);
  const nextXp = getXpToNextLevel(xp);
  const levelXp = currentXp + nextXp;

  const animatedProgress = useSharedValue(progress);
  const prevLevel = useRef(level);
  const hasMounted = useRef(false);
  const glowOpacity = useSharedValue(0);
  const { displayedCurrentXp, displayedLevelXp } = useAnimatedXpNumbers({
    animateNumbers,
    logCount,
    level,
    currentXp,
    levelXp,
  });

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      animatedProgress.value = progress;
      prevLevel.current = level;
      return;
    }

    animatedProgress.value = withSpring(progress, {
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    });

    if (level > prevLevel.current) {
      glowOpacity.value = withSequence(withTiming(0.6, { duration: 180 }), withTiming(0, { duration: 500 }));
    }
    prevLevel.current = level;
  }, [logCount]);

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
        {displayedCurrentXp}/{displayedLevelXp}
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
