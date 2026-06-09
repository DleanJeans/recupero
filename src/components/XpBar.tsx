import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { getLevel, getLevelProgress, getXp, XP_PER_LEVEL } from '../utils/xpUtils';
import { Text } from './Text';

interface XpBarProps {
  logCount: number;
  color?: string;
}
export function XpBar({ logCount, color = Colors.typeNeutral }: XpBarProps) {
  const xp = getXp(logCount);
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Lv{level}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>
        {xp % XP_PER_LEVEL}/{XP_PER_LEVEL}
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
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 30,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.borderDefault,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  value: {
    color: Colors.textFaint,
    fontSize: 10,
    minWidth: 42,
    textAlign: 'right',
  },
});
