import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { NeedConfig } from '../types/need';
import { Colors } from '../utils/colors';
import type { NeedFill } from '../utils/need-fill-utils';
import { getNeedLevelTone, NEED_INFO } from '../utils/need-utils';
import { NEED_TONE_COLORS } from './needs/need-bar-row';
import { Text } from './text';

export const NEED_FILL_ANIMATION_MS = 1100;

interface Props {
  fill: NeedFill;
  config: NeedConfig;
  /** Delay before this row starts filling, so the card has slid in first. */
  delayMs: number;
}

/** One need in the overlay: its bar fills from the old level to the new one while the % counts up. */
export function NeedFillOverlayRow({ fill, config, delayMs }: Props) {
  const info = NEED_INFO[fill.needId];
  const anim = useRef(new Animated.Value(fill.from)).current;
  const [shownPct, setShownPct] = useState(Math.round(fill.from));
  const color = NEED_TONE_COLORS[getNeedLevelTone(shownPct, config.cravingLine)];

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShownPct(Math.round(value)));
    const run = Animated.timing(anim, {
      toValue: fill.to,
      delay: delayMs,
      duration: NEED_FILL_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    run.start();
    return () => {
      run.stop();
      anim.removeListener(id);
    };
  }, [anim, fill.to, delayMs]);

  const width = anim.interpolate({ inputRange: [0, 2, 100], outputRange: ['2%', '2%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <Text
        style={styles.label}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {info.label}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
        <View style={[styles.tick, { left: `${config.cravingLine}%` }]} />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.pct, { color }]}
      >
        {shownPct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  emoji: { fontSize: 16, width: 22, textAlign: 'center' },
  label: { color: Colors.text.primary, fontSize: 14, fontWeight: '600', width: 92 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: Colors.bg.input, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  pct: { minWidth: 44, flexShrink: 0, textAlign: 'right', fontSize: 14, fontWeight: '800' },
});
