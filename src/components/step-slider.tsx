import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { clampToStep, stepValue } from '../utils/step-slider-utils';
import { Button } from './button';
import { Text } from './text';

const THUMB_SIZE = 24;

interface StepSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  /** Text for a value, e.g. "5 min". */
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  color?: string;
}

/** Linear slider with −/+ buttons beside the value. */
export function StepSlider({
  value,
  min,
  max,
  step = 1,
  label,
  formatValue,
  onChange,
  color = Colors.cue.location,
}: StepSliderProps) {
  const sliderRef = useRef<View>(null);
  const [trackX, setTrackX] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const current = clampToStep(value, min, max, step);
  const progress = max > min ? (current - min) / (max - min) : 0;
  const thumbLeft = trackWidth > 0 ? progress * trackWidth - THUMB_SIZE / 2 : -THUMB_SIZE / 2;

  const measure = useCallback(() => {
    sliderRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackX(pageX);
      setTrackWidth(width);
    });
  }, []);
  const handleResponder = useCallback(
    (event: GestureResponderEvent) => {
      if (trackWidth <= 0) return;
      const ratio = Math.max(0, Math.min(1, (event.nativeEvent.pageX - trackX) / trackWidth));
      const next = clampToStep(min + ratio * (max - min), min, max, step);
      if (next !== current) onChange(next);
    },
    [current, max, min, onChange, step, trackWidth, trackX],
  );

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stepper}>
          <Button
            variant="icon"
            onPress={() => onChange(stepValue(current, -1, min, max, step))}
            disabled={current <= min}
            accessibilityLabel={`Decrease ${label}`}
          >
            <Ionicons
              name="remove-circle-outline"
              size={26}
              color={color}
            />
          </Button>
          <Text style={[styles.value, { color }]}>{formatValue(current)}</Text>
          <Button
            variant="icon"
            onPress={() => onChange(stepValue(current, 1, min, max, step))}
            disabled={current >= max}
            accessibilityLabel={`Increase ${label}`}
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={color}
            />
          </Button>
        </View>
      </View>
      <View
        ref={sliderRef}
        style={styles.hitArea}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: current, text: formatValue(current) }}
        accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
        onAccessibilityAction={event =>
          onChange(stepValue(current, event.nativeEvent.actionName === 'increment' ? 1 : -1, min, max, step))
        }
        onLayout={measure}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderStart={measure}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleResponder}
        onResponderMove={handleResponder}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
        <View style={[styles.thumb, { left: thumbLeft }]} />
      </View>
      <View style={styles.range}>
        <Text style={styles.rangeText}>{formatValue(min)}</Text>
        <Text style={styles.rangeText}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 1 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.text.secondary, fontSize: 15, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { minWidth: 56, textAlign: 'center', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hitArea: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.bg.input },
  fill: { height: '100%' },
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
