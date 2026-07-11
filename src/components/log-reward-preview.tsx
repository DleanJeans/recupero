import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { formatVnd } from '../utils/money-utils';
import { Text } from './text';

interface LogRewardPreviewProps {
  xp?: number;
  money?: number;
  undesirable?: boolean;
  xpStrikethrough?: boolean;
}

export function LogRewardPreview({ xp, money, undesirable = false, xpStrikethrough = false }: LogRewardPreviewProps) {
  if (xp == null && money == null) return null;

  return (
    <View style={styles.container}>
      {xp != null && (
        <Text
          style={[styles.reward, undesirable ? styles.penalty : styles.xp, xpStrikethrough && styles.strikethrough]}
        >
          +{xp} XP
        </Text>
      )}
      {money != null && (
        <Text style={[styles.reward, money < 0 ? styles.penalty : styles.money]}>
          {money > 0 ? '+' : money < 0 ? '-' : ''}
          {formatVnd(Math.abs(money))}
        </Text>
      )}
    </View>
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
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'double',
    opacity: 0.55,
  },
  xp: {
    color: Colors.type.desirable,
  },
  money: {
    color: Colors.type.desirable,
  },
  penalty: {
    color: Colors.type.undesirable,
  },
});
