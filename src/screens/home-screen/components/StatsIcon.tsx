import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';

// Match stats-chart-outline: viewBox 512x512, ordered left→right by x
const BAR_FRACTIONS = [160 / 512, 448 / 512, 256 / 512, 368 / 512];
const BAR_COLORS = [Colors.type.desirable, Colors.type.neutral, Colors.type.undesirable, Colors.type.category];

interface StatsIconProps {
  size?: number;
  active?: boolean;
}
export function StatsIcon({ size = 22, active = true }: StatsIconProps) {
  const barWidth = Math.round(size * 0.16);
  const gap = Math.round(size * 0.08);
  const totalWidth = barWidth * 4 + gap * 3;
  const offsetX = Math.round((size - totalWidth) / 2);
  const heightScale = active ? 1.2 : 0.8;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {BAR_COLORS.map((color, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: offsetX + i * (barWidth + gap),
            width: barWidth,
            height: Math.round(size * BAR_FRACTIONS[i] * heightScale),
            borderRadius: Math.round(barWidth / 2),
            backgroundColor: active ? color : Colors.text.dim,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
  },
});
