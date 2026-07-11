import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useBehaviorStore } from '../store/behavior-store';
import { useShopStore } from '../store/shop-store';
import type { RootStackParamList } from '../types/navigation';
import { animateInteger } from '../utils/animation-utils';
import { Colors } from '../utils/colors';
import { formatVnd, getMoneyBalance } from '../utils/money-utils';
import { Text } from './text';

interface MoneyBalanceProps {
  disabled?: boolean;
}

const BALANCE_ANIMATION_MS = 420;
const BALANCE_POP_MS = 140;

export function MoneyBalance({ disabled = false }: MoneyBalanceProps) {
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const tasks = useBehaviorStore(state => state.tasks);
  const purchases = useShopStore(state => state.purchases);
  const balance = useMemo(() => getMoneyBalance(behaviors, purchases, tasks), [behaviors, purchases, tasks]);
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const displayedBalanceRef = useRef(balance);
  const previousBalanceRef = useRef(balance);
  const pendingBalanceRef = useRef<number | null>(null);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const hasFocusedRef = useRef(false);
  const scale = useSharedValue(1);

  const animateBalance = useCallback(
    (targetBalance: number) => {
      const fromBalance = displayedBalanceRef.current;
      if (fromBalance === targetBalance) return;

      cancelTweenRef.current?.();
      scale.value = withSequence(
        withTiming(1.25, { duration: BALANCE_POP_MS }),
        withTiming(1, { duration: BALANCE_ANIMATION_MS - BALANCE_POP_MS }),
      );
      cancelTweenRef.current = animateInteger({
        from: fromBalance,
        to: targetBalance,
        durationMs: BALANCE_ANIMATION_MS,
        onUpdate: value => {
          displayedBalanceRef.current = value;
          setDisplayedBalance(value);
        },
      });
    },
    [scale],
  );

  useEffect(() => {
    return () => cancelTweenRef.current?.();
  }, []);

  useEffect(() => {
    const previousBalance = previousBalanceRef.current;
    previousBalanceRef.current = balance;

    if (!isFocused) {
      if (hasFocusedRef.current && balance !== previousBalance) pendingBalanceRef.current = balance;
      return;
    }

    if (!hasFocusedRef.current) {
      hasFocusedRef.current = true;
      pendingBalanceRef.current = null;
      displayedBalanceRef.current = balance;
      setDisplayedBalance(balance);
      return;
    }

    if (pendingBalanceRef.current != null || balance !== previousBalance) {
      pendingBalanceRef.current = null;
      animateBalance(balance);
    }
  }, [animateBalance, balance, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={() => navigation.navigate('Shop')}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Money balance ${formatVnd(balance)}`}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        <Ionicons
          name="wallet-outline"
          size={17}
          color={balance > 0 ? Colors.type.desirable : Colors.text.muted}
        />
        <Text
          selectable
          style={[styles.value, balance > 0 && styles.valuePositive]}
        >
          {formatVnd(displayedBalance)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 1,
  },
  value: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valuePositive: {
    color: Colors.type.desirable,
  },
});
