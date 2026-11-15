import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SunlightSnapshot } from '../../hooks/use-sunlight';
import { Colors } from '../../utils/colors';
import { formatSunlightMinutes, getLightDoseRate } from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';
import { SunlightLightDose } from './sunlight-light-dose';
import { SUNLIGHT_STATUS_COLORS, SunlightStatusDot } from './sunlight-status-dot';

interface SunlightNowCardProps {
  sunlight: SunlightSnapshot;
}

/** The top of the Sunlight sheet: whether it's counting now, minutes toward the goal and today's light dose. */
export function SunlightNowCard({ sunlight }: SunlightNowCardProps) {
  const { today, goalMinutes, status, manualSession } = sunlight;
  const done = today.minutes >= goalMinutes;
  const color = done ? Colors.type.desirable : SUNLIGHT_COLOR;
  const ratio = Math.min(1, today.minutes / goalMinutes);
  const counting = status.kind === 'counting';
  const ratePerMinute = manualSession
    ? counting
      ? (manualSession.lux ?? 0)
      : 0
    : getLightDoseRate(counting, sunlight.luxNow, sunlight.eyeLevelFactor);

  return (
    <View style={styles.card}>
      <View style={styles.status}>
        <SunlightStatusDot
          kind={status.kind}
          size={10}
        />
        <Text style={[styles.statusText, { color: SUNLIGHT_STATUS_COLORS[status.kind] }]}>{status.label}</Text>
      </View>

      <View style={styles.metric}>
        <View style={styles.header}>
          <Text style={styles.label}>Minutes outside</Text>
          <Text style={[styles.value, { color: today.minutes > 0 ? color : Colors.text.faint }]}>
            {formatSunlightMinutes(today.minutes)}
            <Text style={styles.target}>{` / ${formatSunlightMinutes(goalMinutes)}`}</Text>
          </Text>
        </View>
        <View style={styles.track}>
          {today.minutes > 0 && (
            <View style={[styles.fill, { width: `${Math.max(1, ratio * 100)}%`, backgroundColor: color }]} />
          )}
        </View>
      </View>

      <SunlightLightDose
        luxMinutes={today.luxMinutes}
        ratePerMinute={ratePerMinute}
        snapshotAt={sunlight.now}
        goalMinutes={goalMinutes}
        hasWeather={sunlight.weather != null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    padding: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  metric: {
    gap: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  target: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.bg.card,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
});
