import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '../utils/colors';
import { formatSignedVnd } from '../utils/money-utils';
import { Text } from './text';

export interface MoneyRewardPreview {
  amount: number;
  originalAmount: number;
  multiplier: number;
}

interface LogRewardPreviewProps {
  xp?: number;
  money?: number;
  moneyOriginal?: number;
  moneyMultiplier?: number;
  undesirable?: boolean;
  decayed?: boolean;
  animate?: boolean;
}

export const REWARD_ANIMATION_MS = 850;
const REWARD_ANIMATION_DISTANCE = 24;

export function LogRewardPreview({
  xp,
  money,
  moneyOriginal,
  moneyMultiplier,
  undesirable = false,
  decayed = false,
  animate = false,
}: LogRewardPreviewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = animate ? withTiming(1, { duration: REWARD_ANIMATION_MS }) : 0;
  }, [animate, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -REWARD_ANIMATION_DISTANCE * progress.value }],
  }));

  if (xp == null && money == null) return null;

  const showMoneyMultiplier =
    money != null && moneyOriginal != null && moneyMultiplier != null && moneyMultiplier !== 1;
  const moneyStyle = money != null && money < 0 ? styles.penalty : styles.money;

  return (
    <Animated.View style={[styles.container, animate && animatedStyle]}>
      {xp != null && (
        <Text style={[styles.reward, undesirable ? styles.penalty : styles.xp, decayed && styles.decayed]}>
          +{xp} XP
        </Text>
      )}
      {money != null &&
        (showMoneyMultiplier ? (
          <View style={styles.moneyMultiplierRow}>
            <Text style={[styles.reward, styles.originalMoney, moneyStyle]}>{formatSignedVnd(moneyOriginal)}</Text>
            <Text style={[styles.reward, styles.moneyMultiplier]}>×{moneyMultiplier}</Text>
            <Text style={[styles.reward, moneyStyle]}>{formatSignedVnd(money)}</Text>
          </View>
        ) : (
          <Text style={[styles.reward, moneyStyle]}>{formatSignedVnd(money)}</Text>
        ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  reward: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  decayed: {
    opacity: 0.5,
  },
  xp: {
    color: Colors.type.desirable,
  },
  money: {
    color: Colors.type.desirable,
  },
  moneyMultiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  originalMoney: {
    opacity: 0.65,
    textDecorationLine: 'line-through',
  },
  moneyMultiplier: {
    color: Colors.star.filled,
  },
  penalty: {
    color: Colors.type.undesirable,
  },
});
