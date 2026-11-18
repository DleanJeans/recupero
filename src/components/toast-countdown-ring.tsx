import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';

const SEGMENTS = 24;
const SEGMENT_WIDTH = 3;
const SEGMENT_LENGTH = 6;

interface Props {
  /** Share (0..1) of the time still left; the ring drains clockwise. */
  share: number;
  size?: number;
  children?: React.ReactNode;
}

/** A ring of small ticks that switch off one by one as time runs out, with content in the middle. */
export function ToastCountdownRing({ share, size = 46, children }: Props) {
  const lit = Math.ceil(share * SEGMENTS);
  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.spoke,
            { width: size, height: size, transform: [{ rotate: `${(index * 360) / SEGMENTS}deg` }] },
          ]}
        >
          <View style={[styles.tick, index < lit && styles.tickLit]} />
        </View>
      ))}
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  spoke: { position: 'absolute', alignItems: 'center' },
  tick: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_LENGTH,
    borderRadius: SEGMENT_WIDTH / 2,
    backgroundColor: Colors.border.default,
  },
  tickLit: { backgroundColor: Colors.cooldown.green },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
