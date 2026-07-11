import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { formatVnd } from '../utils/money-utils';
import { Text } from './text';

interface LogRewardPreviewProps {
  xp?: number;
  money?: number;
  undesirable?: boolean;
  decayed?: boolean;
}

export function LogRewardPreview({ xp, money, undesirable = false, decayed = false }: LogRewardPreviewProps) {
  if (xp == null && money == null) return null;

  return (
    <View style={styles.container}>
      {xp != null && (
        <Text style={[styles.reward, undesirable ? styles.penalty : styles.xp, decayed && styles.decayed]}>
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
  decayed: {
    opacity: 0.5,
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
