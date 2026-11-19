import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNeedLevels } from '../hooks/use-need-levels';
import { useNeedsStore } from '../store/needs-store';
import type { NeedId } from '../types/need';
import { Colors } from '../utils/colors';
import { getNeedFills, mergeNeedFills, NEED_FILL_MAX_AGE_MS, type NeedFill } from '../utils/need-fill-utils';
import { NEED_FILL_ANIMATION_MS, NeedFillOverlayRow } from './need-fill-overlay-row';

const SLIDE_MS = 320;
const HOLD_MS = 1200;
const ROW_STAGGER_MS = 150;
const HIDDEN_OFFSET = -220;

interface Props {
  /** Fills show only while this is true (the Routines screen is in front). */
  active: boolean;
}

/**
 * Slides a card down from the top when a log fills needs: each need's bar fills up while its % counts up.
 * A log made on the log screen waits until Routines is back in front.
 */
export function NeedFillOverlayHost({ active }: Props) {
  const insets = useSafeAreaInsets();
  const { needs } = useNeedLevels();
  const configs = useNeedsStore(state => state.needs);
  const previous = useRef<Map<NeedId, number> | undefined>(undefined);
  const waiting = useRef<{ fills: NeedFill[]; at: number }>({ fills: [], at: 0 });
  const [shown, setShown] = useState<NeedFill[]>([]);
  const slide = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const showing = shown.length > 0;

  // Compare each refresh with the last one; the first only seeds, so app start shows nothing.
  useEffect(() => {
    if (previous.current) {
      const fills = getNeedFills(previous.current, needs);
      if (fills.length > 0) {
        waiting.current = { fills: mergeNeedFills(waiting.current.fills, fills), at: Date.now() };
      }
    }
    previous.current = new Map(needs.flatMap(need => (need.level == null ? [] : [[need.id, need.level] as const])));
    if (!active || showing || waiting.current.fills.length === 0) return;
    const { fills, at } = waiting.current;
    waiting.current = { fills: [], at: 0 };
    if (Date.now() - at <= NEED_FILL_MAX_AGE_MS) setShown(fills);
  }, [needs, active, showing]);

  useEffect(() => {
    if (!showing) return;
    slide.setValue(HIDDEN_OFFSET);
    const rowsMs = NEED_FILL_ANIMATION_MS + ROW_STAGGER_MS * shown.length;
    const run = Animated.sequence([
      Animated.timing(slide, {
        toValue: 0,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(rowsMs + HOLD_MS),
      Animated.timing(slide, {
        toValue: HIDDEN_OFFSET,
        duration: SLIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) setShown([]);
    });
    return () => run.stop();
  }, [showing, shown.length, slide]);

  if (!showing) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, { top: insets.top + 8, transform: [{ translateY: slide }] }]}
    >
      {shown.map((fill, index) => (
        <NeedFillOverlayRow
          key={fill.needId}
          fill={fill}
          config={configs[fill.needId]}
          delayMs={SLIDE_MS + index * ROW_STAGGER_MS}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: Colors.bg.darker,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 8,
  },
});
