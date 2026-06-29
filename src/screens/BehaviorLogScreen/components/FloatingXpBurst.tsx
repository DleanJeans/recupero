import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

const XP_BURST_ANIMATION_MS = 850;
const XP_BURST_DISTANCE = 54;
const XP_BURST_HEIGHT = 28;

export type XpBurst = { id: number; x: number; y: number; xp: number };

interface Props {
  burst: XpBurst;
  onDone: (id: number) => void;
}

export function FloatingXpBurst({ burst, onDone }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: XP_BURST_ANIMATION_MS }, finished => {
      if (finished) runOnJS(onDone)(burst.id);
    });
  }, [burst.id, onDone, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -XP_BURST_DISTANCE * progress.value }, { scale: 1 + 0.08 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.xpBurst,
        {
          left: burst.x - 52,
          top: burst.y - XP_BURST_HEIGHT / 2,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.xpBurstText}>+{burst.xp} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  xpBurst: {
    position: 'absolute',
    minWidth: 104,
    height: XP_BURST_HEIGHT,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBurstText: {
    color: Colors.type.desirable,
    fontSize: 16,
    fontWeight: '800',
  },
});
