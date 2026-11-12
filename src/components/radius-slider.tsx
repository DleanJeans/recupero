import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import {
  clampGeofenceRadius,
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  radiusToSliderRatio,
  sliderRatioToRadius,
  stepGeofenceRadius,
} from '../utils/geofence-utils';
import { Button } from './button';
import { Text } from './text';

const THUMB_SIZE = 24;
/** Labels under the log-scale track, placed at their real positions. */
const TICKS = [1, 10, 50, 200];
const TICK_LABEL_WIDTH = 40;
/** With `revealOnTap`, the slider tucks away again after this long untouched. */
const REVEAL_IDLE_MS = 4000;

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  /** Accent for the value, fill and −/+ buttons. */
  color?: string;
  /**
   * Hide the slider until −, + or the value is tapped, and tuck it away after a few idle seconds, so swiping
   * to scroll a sheet can't change the radius by accident.
   */
  revealOnTap?: boolean;
}

/** Log-scale radius slider (1–200 m) with −/+ buttons at both ends of the value. */
export function RadiusSlider({
  value,
  onChange,
  label = 'Geofence radius',
  color = Colors.cue.location,
  revealOnTap = false,
}: RadiusSliderProps) {
  const sliderRef = useRef<View>(null);
  const [revealed, setRevealed] = useState(!revealOnTap);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdOpen = useCallback(() => {
    if (!revealOnTap) return;
    clearTimeout(hideTimer.current);
    setRevealed(true);
  }, [revealOnTap]);
  const scheduleHide = useCallback(() => {
    if (!revealOnTap) return;
    clearTimeout(hideTimer.current);
    setRevealed(true);
    hideTimer.current = setTimeout(() => setRevealed(false), REVEAL_IDLE_MS);
  }, [revealOnTap]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const step = (direction: 1 | -1) => {
    onChange(stepGeofenceRadius(normalized, direction));
    scheduleHide();
  };
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
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stepper}>
          <Button
            variant="icon"
            onPress={() => step(-1)}
            disabled={normalized <= MIN_GEOFENCE_RADIUS_M}
            accessibilityLabel="Decrease radius"
          >
            <Ionicons
              name="remove-circle-outline"
              size={26}
              color={color}
            />
          </Button>
          <Pressable
            onPress={revealOnTap ? () => (revealed ? setRevealed(false) : scheduleHide()) : undefined}
            disabled={!revealOnTap}
            hitSlop={8}
            accessibilityRole={revealOnTap ? 'button' : undefined}
            accessibilityHint={revealOnTap ? 'Shows the radius slider' : undefined}
          >
            <Text style={[styles.value, { color }]}>{normalized} m</Text>
          </Pressable>
          <Button
            variant="icon"
            onPress={() => step(1)}
            disabled={normalized >= MAX_GEOFENCE_RADIUS_M}
            accessibilityLabel="Increase radius"
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={color}
            />
          </Button>
        </View>
      </View>
      {revealed && (
        <>
          <View
            ref={sliderRef}
            style={styles.hitArea}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
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
            // Keep the drag when the slider sits inside a scroll view or sheet.
            onResponderTerminationRequest={() => false}
            onResponderGrant={event => {
              holdOpen();
              handleResponder(event);
            }}
            onResponderMove={handleResponder}
            onResponderRelease={scheduleHide}
          >
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
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
        </>
      )}
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
