import React, { useCallback, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

const MIN_RADIUS = 50;
const MAX_RADIUS = 1000;
const RADIUS_STEP = 25;
const THUMB_SIZE = 24;

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const sliderRef = useRef<View>(null);
  const [trackX, setTrackX] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const normalized = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, value));
  const progress = (normalized - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
  const thumbLeft = trackWidth > 0 ? progress * trackWidth - THUMB_SIZE / 2 : -THUMB_SIZE / 2;

  const updateFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / trackWidth));
      const next = Math.round((MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS)) / RADIUS_STEP) * RADIUS_STEP;
      if (next !== value) onChange(next);
    },
    [onChange, trackWidth, value],
  );
  const measure = useCallback(() => {
    sliderRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackX(pageX);
      setTrackWidth(width);
    });
  }, []);
  const handleResponder = useCallback(
    (event: GestureResponderEvent) => updateFromX(event.nativeEvent.pageX - trackX),
    [trackX, updateFromX],
  );

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Geofence radius</Text>
        <Text style={styles.value}>{normalized} m</Text>
      </View>
      <View
        ref={sliderRef}
        style={styles.hitArea}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Geofence radius"
        accessibilityValue={{ min: MIN_RADIUS, max: MAX_RADIUS, now: normalized, text: `${normalized} metres` }}
        accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
        onAccessibilityAction={event => {
          const delta = event.nativeEvent.actionName === 'increment' ? RADIUS_STEP : -RADIUS_STEP;
          onChange(Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, normalized + delta)));
        }}
        onLayout={measure}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderStart={measure}
        onResponderGrant={handleResponder}
        onResponderMove={handleResponder}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: thumbLeft }]} />
      </View>
      <View style={styles.range}>
        <Text style={styles.rangeText}>{MIN_RADIUS} m</Text>
        <Text style={styles.rangeText}>1 km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 1, backgroundColor: Colors.bg.card, borderRadius: 12, padding: 13 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.text.secondary, fontSize: 14, fontWeight: '600' },
  value: { color: Colors.cue.location, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hitArea: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.bg.input },
  fill: { height: '100%', backgroundColor: Colors.cue.location },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.text.primary,
    borderWidth: 3,
    borderColor: Colors.bg.card,
  },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { color: Colors.text.faint, fontSize: 11, fontWeight: '600' },
});
