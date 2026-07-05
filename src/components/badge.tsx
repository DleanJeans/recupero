import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './text';

interface BadgeProps {
  count: number;
  maxCount?: number;
  size?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ count, maxCount = 99, size = 16, fontSize = 10, style }: BadgeProps) {
  const label = count > maxCount ? `${maxCount}+` : String(count);

  return (
    <View style={[styles.badge, style, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.6}
        style={[styles.badgeText, { width: size, fontSize, lineHeight: size }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cooldown.red,
    overflow: 'hidden',
  },
  badgeText: {
    color: Colors.text.primary,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
