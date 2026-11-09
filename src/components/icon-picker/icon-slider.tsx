import React, { useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { Text } from '../text';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Values snap to multiples of this. */
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

const THUMB = 18;

/** A labelled horizontal slider: drag or tap anywhere on the track. */
export function IconSlider({ label, value, min, max, step, format, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, min, max, step, onChange });
  latest.current = { width, min, max, step, onChange };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => update(event.nativeEvent.locationX),
      onPanResponderMove: event => update(event.nativeEvent.locationX),
    }),
  ).current;

  function update(x: number) {
    const { width: w, min: lo, max: hi, step: s, onChange: change } = latest.current;
    if (w <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    const raw = lo + ratio * (hi - lo);
    change(Math.round(raw / s) * s);
  }

  const ratio = (Math.min(max, Math.max(min, value)) - min) / (max - min);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={styles.touch}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View
          style={styles.track}
          pointerEvents="none"
        >
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: ratio * width - THUMB / 2 }]}
        />
      </View>
      <Text style={styles.value}>{format(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 64, color: Colors.text.light, fontSize: 12 },
  touch: { flex: 1, height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.border.default, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: Colors.cooldown.yellow },
  thumb: {
    position: 'absolute',
    top: 16 - THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.text.primary,
  },
  value: { width: 40, textAlign: 'right', color: Colors.text.muted, fontSize: 12 },
});
