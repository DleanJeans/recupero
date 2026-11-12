import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { sliderRatioOf, sliderSnap, sliderValueAt } from '../../utils/slider-utils';
import { Text } from '../text';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Values snap to multiples of this. */
  step: number;
  /** Value at the middle of the track, when it isn't halfway between min and max (e.g. 1× zoom). */
  center?: number;
  /** Show − and + buttons at the ends that nudge by one step (hold to repeat). */
  stepper?: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

const THUMB = 18;
const HOLD_DELAY = 400;
const HOLD_EVERY = 70;

/** A labelled horizontal slider: drag or tap anywhere on the track. */
export function IconSlider({ label, value, min, max, step, center, stepper, format, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, value, min, max, step, center, onChange });
  latest.current = { width, value, min, max, step, center, onChange };
  /** Finger x on the track when the drag started; moves add the gesture's dx to it. Android reports locationX for
   *  move events against whatever view is under the finger, which made the thumb jump around. */
  const startX = useRef(0);
  const hold = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        startX.current = event.nativeEvent.locationX;
        update(startX.current);
      },
      onPanResponderMove: (_event, gesture) => update(startX.current + gesture.dx),
    }),
  ).current;

  function update(x: number) {
    const { width: w, min: lo, max: hi, step: s, center: mid, onChange: change } = latest.current;
    if (w <= 0) return;
    change(sliderSnap(sliderValueAt(x / w, lo, hi, mid), lo, hi, s));
  }

  function nudge(direction: 1 | -1) {
    const { value: v, min: lo, max: hi, step: s, onChange: change } = latest.current;
    const next = sliderSnap(v + direction * s, lo, hi, s);
    if (next !== v) change(next);
  }

  function stopHold() {
    clearTimeout(hold.current.delay);
    clearInterval(hold.current.repeat);
    hold.current = {};
  }

  function startHold(direction: 1 | -1) {
    stopHold();
    nudge(direction);
    hold.current.delay = setTimeout(() => {
      hold.current.repeat = setInterval(() => nudge(direction), HOLD_EVERY);
    }, HOLD_DELAY);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear any running hold timer on unmount only
  useEffect(() => stopHold, []);

  const ratio = sliderRatioOf(value, min, max, center);

  const button = (direction: 1 | -1) => (
    <Pressable
      onPressIn={() => startHold(direction)}
      onPressOut={stopHold}
      hitSlop={6}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}
      accessibilityLabel={`${direction > 0 ? 'Increase' : 'Decrease'} ${label.toLowerCase()}`}
    >
      <Ionicons
        name={direction > 0 ? 'add' : 'remove'}
        size={16}
        color={Colors.text.light}
      />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {stepper && button(-1)}
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
        {center != null && (
          <View
            pointerEvents="none"
            style={styles.centerTick}
          />
        )}
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: ratio * width - THUMB / 2 }]}
        />
      </View>
      {stepper && button(1)}
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
  centerTick: {
    position: 'absolute',
    left: '50%',
    top: 10,
    width: 2,
    height: 12,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: Colors.border.default,
  },
  thumb: {
    position: 'absolute',
    top: 16 - THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.text.primary,
  },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  value: { width: 40, textAlign: 'right', color: Colors.text.muted, fontSize: 12 },
});
