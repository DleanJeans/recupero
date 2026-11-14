import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { getLightDoseTarget, getLiveLuxMinutes, LIGHT_DOSE_TARGET_LUX } from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

interface SunlightLightDoseProps {
  luxMinutes: number;
  /** Dose gained per minute right now (0 unless counting); the number and bar grow by this every frame. */
  ratePerMinute: number;
  /** When `luxMinutes` was worked out. */
  snapshotAt: number;
  goalMinutes: number;
  hasWeather: boolean;
  /** Share of the light that reaches your eyes right now. */
  eyeLevelFactor: number;
}

/** Re-renders every frame while `running`, returning the current time. */
function useFrameClock(running: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return now;
}

/** Today's light dose (eye-level lux × minutes outside) against 10,000 lux for every goal minute, live while out. */
export function SunlightLightDose({
  luxMinutes,
  ratePerMinute,
  snapshotAt,
  goalMinutes,
  hasWeather,
  eyeLevelFactor,
}: SunlightLightDoseProps) {
  const now = useFrameClock(ratePerMinute > 0);
  const live = ratePerMinute > 0 ? getLiveLuxMinutes(luxMinutes, ratePerMinute, snapshotAt, now) : luxMinutes;
  const target = getLightDoseTarget(goalMinutes);
  const ratio = Math.min(1, live / target);
  const done = live >= target;
  const color = done ? Colors.type.desirable : SUNLIGHT_COLOR;
  const percent = ((live / target) * 100).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Light dose</Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <Text style={[styles.value, { color: live > 0 ? color : Colors.text.faint }]}>
        {Math.floor(live).toLocaleString('en-US')}
        <Text style={styles.target}>{` / ${target.toLocaleString('en-US')} lux·min`}</Text>
      </Text>
      <View style={styles.track}>
        {live > 0 && <View style={[styles.fill, { width: `${Math.max(1, ratio * 100)}%`, backgroundColor: color }]} />}
      </View>
      <Text style={styles.hint}>
        {hasWeather
          ? `Estimated lux × ${Math.round(eyeLevelFactor * 100)}% (you're not looking at the sky, set below) × minutes outside. Goal: ${LIGHT_DOSE_TARGET_LUX.toLocaleString('en-US')} lux × ${goalMinutes} min.`
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
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  target: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  percent: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
