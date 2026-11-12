import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SunlightSnapshot } from '../../hooks/use-sunlight';
import { Colors } from '../../utils/colors';
import { formatLux, getSunEventText } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';
import { SUNLIGHT_STATUS_COLORS, SunlightStatusDot } from './sunlight-status-dot';

export const SUNLIGHT_COLOR = '#fbbf24';

interface SunlightBarRowProps {
  sunlight: SunlightSnapshot;
  onPress: () => void;
}

/** Today's outdoor time while the sun is up, filling toward the daily goal (under the needs bars). */
export function SunlightBarRow({ sunlight, onPress }: SunlightBarRowProps) {
  const { today, goalMinutes, status, now, tomorrowSunrise, luxNow } = sunlight;
  const ratio = Math.min(1, today.minutes / goalMinutes);
  const done = today.minutes >= goalMinutes;
  const color = done ? Colors.type.desirable : SUNLIGHT_COLOR;
  const sunEvent = getSunEventText(today, now, ts => formatTime(ts), tomorrowSunrise);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sunlight ${today.minutes} of ${goalMinutes} minutes`}
    >
      <View style={styles.main}>
        <Text style={styles.emoji}>☀️</Text>
        <Text style={styles.label}>Sunlight</Text>
        <View style={styles.track}>
          {today.minutes > 0 && (
            <View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }]} />
          )}
        </View>
        <Text style={[styles.value, { color: today.minutes > 0 ? color : Colors.text.faint }]}>{today.minutes}m</Text>
      </View>
      <View style={styles.detailRow}>
        <SunlightStatusDot kind={status.kind} />
        <Text
          style={styles.detail}
          numberOfLines={1}
        >
          <Text style={{ color: SUNLIGHT_STATUS_COLORS[status.kind] }}>{status.label}</Text>
          {luxNow != null ? ` · ${formatLux(luxNow)} now` : ''}
          {` · of ${goalMinutes} min`}
          {sunEvent ? ` · ${sunEvent}` : ''}
        </Text>
      </View>
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
  value: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 30,
  },
  detail: {
    flex: 1,
    color: Colors.text.faint,
    fontSize: 11,
  },
});
