import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';

interface Props {
  /** Share (0..1) of the ring filled, clockwise from the top. */
  share: number;
  size?: number;
  thickness?: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/**
 * A solid circular progress ring (track + arc) with content in the middle, drawn with plain Views
 * (two clipped half circles) so it needs no SVG module.
 */
export function ProgressRing({
  share,
  size = 40,
  thickness = 4,
  color,
  trackColor = Colors.border.default,
  children,
}: Props) {
  const angle = Math.max(0, Math.min(1, share)) * 360;
  const first = Math.min(angle, 180);
  const second = Math.max(0, angle - 180);
  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: thickness };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.abs, ring, { borderColor: trackColor }]} />
      <View style={[styles.abs, styles.clip, { left: half, width: half, height: size }]}>
        <View
          style={[
            styles.abs,
            ring,
            {
              left: -half,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${first - 135}deg` }],
            },
          ]}
        />
      </View>
      <View style={[styles.abs, styles.clip, { left: 0, width: half, height: size }]}>
        <View
          style={[
            styles.abs,
            ring,
            {
              left: 0,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${45 + second}deg` }],
            },
          ]}
        />
      </View>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0 },
  clip: { overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
