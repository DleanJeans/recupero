import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import {
  EYE_LEVEL_LUX_FACTOR,
  formatLuxMinutes,
  getLightDoseTarget,
  LIGHT_DOSE_TARGET_LUX,
} from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

interface SunlightLightDoseProps {
  luxMinutes: number;
  goalMinutes: number;
  hasWeather: boolean;
}

/** Today's light dose (eye-level lux × minutes outside) against 10,000 lux for every goal minute. */
export function SunlightLightDose({ luxMinutes, goalMinutes, hasWeather }: SunlightLightDoseProps) {
  const target = getLightDoseTarget(goalMinutes);
  const ratio = Math.min(1, luxMinutes / target);
  const done = luxMinutes >= target;
  const color = done ? Colors.type.desirable : SUNLIGHT_COLOR;
  const percent = Math.floor((luxMinutes / target) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Light dose</Text>
        <Text style={[styles.value, { color: luxMinutes > 0 ? color : Colors.text.faint }]}>
          {formatLuxMinutes(luxMinutes)} / {formatLuxMinutes(target)} lux·min
          <Text style={styles.percent}>{`  ${percent}%`}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        {luxMinutes > 0 && (
          <View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }]} />
        )}
      </View>
      <Text style={styles.hint}>
        {hasWeather
          ? `Estimated lux × ${Math.round(EYE_LEVEL_LUX_FACTOR * 100)}% (you're not looking at the sky) × minutes outside. Goal: ${LIGHT_DOSE_TARGET_LUX.toLocaleString('en-US')} lux × ${goalMinutes} min.`
          : 'Waiting for the hourly weather to estimate light. It loads when the app opens with internet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  percent: {
    color: Colors.text.muted,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg.card,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 11,
    lineHeight: 15,
  },
});
