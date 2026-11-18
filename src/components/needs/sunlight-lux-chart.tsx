import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SunlightDay, SunlightWeather } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { formatLux, getLuxCurve } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const CHART_HEIGHT = 80;

interface SunlightLuxChartProps {
  day: SunlightDay;
  weather?: SunlightWeather;
  now: number;
  isToday: boolean;
}

/** Estimated light from sunrise to sunset; the slices you spent outside are highlighted. */
export function SunlightLuxChart({ day, weather, now, isToday }: SunlightLuxChartProps) {
  const points = useMemo(
    () => getLuxCurve(day.sunrise, day.sunset, weather?.hours ?? [], weather?.calibration, day.stretches),
    [day, weather],
  );
  if (points.length === 0 || day.sunrise == null || day.sunset == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No light data for this day yet.</Text>
      </View>
    );
  }
  const max = Math.max(...points.map(point => point.lux));
  const nowIndex = isToday ? points.findIndex(point => point.ts >= now) : -1;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>Light through the day</Text>
        <Text style={styles.peak}>{`peak ${formatLux(max)}`}</Text>
      </View>
      <View style={styles.chart}>
        {points.map((point, index) => (
          <View
            key={point.ts}
            style={styles.column}
          >
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(point.lux > 0 ? 2 : 0, (point.lux / max) * CHART_HEIGHT),
                  backgroundColor: point.out ? SUNLIGHT_COLOR : Colors.border.light,
                  opacity: nowIndex >= 0 && index > nowIndex ? 0.45 : 1,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{formatTime(day.sunrise)}</Text>
        <Text style={styles.label}>{formatTime(day.sunset)}</Text>
      </View>
      <Text style={styles.legend}>Bright bars: time you were outside</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  peak: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: Colors.text.faint,
    fontSize: 10,
  },
  legend: {
    color: Colors.text.faint,
    fontSize: 10,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 12,
  },
});
