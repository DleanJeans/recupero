import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAnimatedXPNumbers } from '../hooks/use-animated-xp-numbers';
import { Colors } from '../utils/colors';
import { getLevel, getLevelProgress, getLevelXp, getXpToNextLevel } from '../utils/xp-utils';
import { Text } from './text';

interface XPBarProps {
  xp: number;
  color?: string;
  label?: string;
  animateNumbers?: boolean;
  motionEnabled?: boolean;
}

interface XPBarValues {
  level: number;
  progress: number;
  currentXp: number;
  levelXp: number;
}

export function XPBar({
  xp,
  color = Colors.type.neutral,
  label,
  animateNumbers = false,
  motionEnabled = true,
}: XPBarProps) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const currentXp = getLevelXp(xp);
  const nextXp = getXpToNextLevel(xp);
  const levelXp = currentXp + nextXp;
  const values = { level, progress, currentXp, levelXp };

  if (!motionEnabled) {
    return (
      <StaticXPBar
        values={values}
        color={color}
        label={label}
      />
    );
  }

  return (
    <AnimatedXPBar
      xp={xp}
      values={values}
      color={color}
      label={label}
      animateNumbers={animateNumbers}
    />
  );
}

interface StaticXPBarProps {
  values: XPBarValues;
  color: string;
  label?: string;
}

function StaticXPBar({ values, color, label }: StaticXPBarProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.title}>{label}</Text>}
      <View style={styles.row}>
        <Text style={styles.level}>Lv{values.level}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { backgroundColor: color, width: `${values.progress * 100}%` }]} />
        </View>
        <Text style={styles.value}>
          {values.currentXp}/{values.levelXp}
        </Text>
      </View>
    </View>
  );
}

interface AnimatedXPBarProps {
  xp: number;
  values: XPBarValues;
  color: string;
  label?: string;
  animateNumbers: boolean;
}

function AnimatedXPBar({ xp, values, color, label, animateNumbers }: AnimatedXPBarProps) {
  const animatedProgress = useSharedValue(values.progress);
  const prevLevel = useRef(values.level);
  const hasMounted = useRef(false);
  const glowOpacity = useSharedValue(0);
  const { displayedCurrentXp, displayedLevelXp } = useAnimatedXPNumbers({
    animateNumbers,
    xp,
    level: values.level,
    currentXp: values.currentXp,
    levelXp: values.levelXp,
  });

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      animatedProgress.value = values.progress;
      prevLevel.current = values.level;
      return;
    }

    animatedProgress.value = withSpring(values.progress, {
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    });

    if (values.level > prevLevel.current) {
      glowOpacity.value = withSequence(withTiming(0.6, { duration: 180 }), withTiming(0, { duration: 500 }));
    }
    prevLevel.current = values.level;
  }, [values.level, values.progress, xp, animatedProgress, glowOpacity]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {label && <Text style={styles.title}>{label}</Text>}
      <View style={styles.row}>
        <Text style={styles.level}>Lv{values.level}</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
          <Animated.View style={[styles.glow, { backgroundColor: color }, glowStyle]} />
        </View>
        <Text style={styles.value}>
          {displayedCurrentXp}/{displayedLevelXp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  title: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  level: {
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
