import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';
import { XP_PER_LOG } from '../../../utils/xpUtils';

const XP_BURST_ANIMATION_MS = 850;
const XP_BURST_DISTANCE = 54;
const XP_BURST_HEIGHT = 28;
const XP_BURST_WIDTH = 76;

export type XpBurst = { id: number; x: number; y: number };

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
          left: burst.x - XP_BURST_WIDTH / 2,
          top: burst.y - XP_BURST_HEIGHT / 2,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.xpBurstText}>+{XP_PER_LOG} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  xpBurst: {
    position: 'absolute',
    width: XP_BURST_WIDTH,
    height: XP_BURST_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBurstText: {
    color: Colors.type.desirable,
    fontSize: 16,
    fontWeight: '800',
  },
});
