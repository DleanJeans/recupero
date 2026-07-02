import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface AnimatedStarSlotProps {
  filled: boolean;
  threshold: number | null;
  size: number;
  color: string;
  emptyColor: string;
}

/** Owns its own animation state so the pop + ring fire on a false -> true transition without disturbing siblings. */
export function AnimatedStarSlot({ filled, threshold, size, color, emptyColor }: AnimatedStarSlotProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const prevFilled = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevFilled.current === null) {
      scale.value = 1;
      ringScale.value = 0.5;
      ringOpacity.value = 0;
    } else if (filled && !prevFilled.current) {
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
