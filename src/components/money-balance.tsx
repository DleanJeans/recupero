import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { useShopStore } from '../store/shop-store';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { formatVnd, getMoneyBalance } from '../utils/money-utils';
import { Text } from './text';

interface MoneyBalanceProps {
  disabled?: boolean;
}

export function MoneyBalance({ disabled = false }: MoneyBalanceProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const tasks = useBehaviorStore(state => state.tasks);
  const purchases = useShopStore(state => state.purchases);
  const balance = useMemo(() => getMoneyBalance(behaviors, purchases, tasks), [behaviors, purchases, tasks]);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={() => navigation.navigate('Shop')}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Money balance ${formatVnd(balance)}`}
    >
      <Ionicons
        name="wallet-outline"
        size={17}
        color={balance > 0 ? Colors.type.desirable : Colors.text.muted}
      />
      <Text
        selectable
        style={[styles.value, balance > 0 && styles.valuePositive]}
      >
        {formatVnd(balance)}
      </Text>
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
