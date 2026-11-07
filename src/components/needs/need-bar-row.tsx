import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NeedConfig, NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { getNeedLevelTone, NEED_INFO, type NeedLevelTone } from '../../utils/need-utils';
import { Text } from '../text';

export const NEED_TONE_COLORS: Record<NeedLevelTone, string> = {
  good: Colors.type.desirable,
  low: Colors.type.neutral,
  craving: Colors.type.undesirable,
};

interface NeedBarRowProps {
  needId: NeedId;
  config: NeedConfig;
  level?: number;
  detail: string;
  onPress: () => void;
}

/** One Sims-style need: name, level bar with a tick at the craving line, and when it next craves. */
export function NeedBarRow({ needId, config, level, detail, onPress }: NeedBarRowProps) {
  const info = NEED_INFO[needId];
  const tone = level == null ? undefined : getNeedLevelTone(level, config.cravingLine);
  const color = tone ? NEED_TONE_COLORS[tone] : Colors.text.faint;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${info.label} ${level == null ? 'unknown' : `${Math.round(level)}%`}`}
    >
      <View style={styles.main}>
        <Text style={styles.emoji}>{info.emoji}</Text>
        <Text style={styles.label}>{info.label}</Text>
        <View style={styles.track}>
          {level != null && <View style={[styles.fill, { width: `${Math.max(2, level)}%`, backgroundColor: color }]} />}
          <View style={[styles.tick, { left: `${config.cravingLine}%` }]} />
        </View>
        <Text style={[styles.pct, { color }]}>{level == null ? '–' : `${Math.round(level)}%`}</Text>
      </View>
      <Text style={[styles.detail, tone === 'craving' && { color }]}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 6,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  label: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    width: 64,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg.input,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pct: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.faint,
    fontSize: 11,
    marginLeft: 30,
  },
});
