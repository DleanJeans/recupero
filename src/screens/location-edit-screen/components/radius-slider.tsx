import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import {
  clampGeofenceRadius,
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  radiusToSliderRatio,
  sliderRatioToRadius,
  stepGeofenceRadius,
} from '../../../utils/geofence-utils';

const THUMB_SIZE = 24;
/** Labels under the log-scale track, placed at their real positions. */
const TICKS = [1, 10, 50, 200];
const TICK_LABEL_WIDTH = 40;

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const sliderRef = useRef<View>(null);
  const [trackX, setTrackX] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [tickWidth, setTickWidth] = useState(0);
  const normalized = clampGeofenceRadius(value);
  const progress = radiusToSliderRatio(normalized);
  const thumbLeft = trackWidth > 0 ? progress * trackWidth - THUMB_SIZE / 2 : -THUMB_SIZE / 2;

  const updateFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) return;
      const next = sliderRatioToRadius(x / trackWidth);
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
        <View style={styles.stepper}>
          <Button
            variant="icon"
            onPress={() => onChange(stepGeofenceRadius(normalized, -1))}
            disabled={normalized <= MIN_GEOFENCE_RADIUS_M}
            accessibilityLabel="Decrease radius"
          >
            <Ionicons
              name="remove-circle-outline"
              size={26}
              color={Colors.cue.location}
            />
          </Button>
          <Text style={styles.value}>{normalized} m</Text>
          <Button
            variant="icon"
            onPress={() => onChange(stepGeofenceRadius(normalized, 1))}
            disabled={normalized >= MAX_GEOFENCE_RADIUS_M}
            accessibilityLabel="Increase radius"
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={Colors.cue.location}
            />
          </Button>
        </View>
      </View>
      <View
        ref={sliderRef}
        style={styles.hitArea}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Geofence radius"
        accessibilityValue={{
          min: MIN_GEOFENCE_RADIUS_M,
          max: MAX_GEOFENCE_RADIUS_M,
          now: normalized,
          text: `${normalized} metres`,
        }}
        accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
        onAccessibilityAction={event => {
          onChange(stepGeofenceRadius(normalized, event.nativeEvent.actionName === 'increment' ? 1 : -1));
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
      <View
        style={styles.range}
        onLayout={event => setTickWidth(event.nativeEvent.layout.width)}
      >
        {TICKS.map((tick, index) => {
          const isLast = index === TICKS.length - 1;
          const left = radiusToSliderRatio(tick) * tickWidth;
          return (
            <Text
              key={tick}
              style={[
                styles.rangeText,
                isLast ? { right: 0 } : { left: index === 0 ? 0 : left - TICK_LABEL_WIDTH / 2 },
                index > 0 && !isLast && styles.centeredTick,
              ]}
            >
              {tick} m
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 1, backgroundColor: Colors.bg.card, borderRadius: 12, padding: 13 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.text.secondary, fontSize: 14, fontWeight: '600' },
  value: {
    minWidth: 52,
    textAlign: 'center',
    color: Colors.cue.location,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  range: { height: 16 },
  rangeText: { position: 'absolute', color: Colors.text.faint, fontSize: 11, fontWeight: '600' },
  centeredTick: { width: TICK_LABEL_WIDTH, textAlign: 'center' },
});
