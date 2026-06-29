import React, { useCallback, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { useSettingsStore } from '../../../store/settingsStore';
import { Colors } from '../../../utils/colors';

const MIN_CUTOFF_HOUR = 0;
const MAX_CUTOFF_HOUR = 8;
const THUMB_SIZE = 24;

function formatCutoffHour(hour: number, timeFormat: '12h' | '24h'): string {
  if (timeFormat === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return 'Midnight';
  if (hour === 12) return 'Noon';
  return `${hour % 12} AM`;
}

function clampCutoffHour(hour: number): number {
  return Math.max(MIN_CUTOFF_HOUR, Math.min(MAX_CUTOFF_HOUR, Math.round(hour)));
}

export function DayCutoffPicker() {
  const { dayCutoffHour, setDayCutoffHour, timeFormat } = useSettingsStore();
  const sliderRef = useRef<View>(null);
  const [trackX, setTrackX] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const label = useMemo(() => formatCutoffHour(dayCutoffHour, timeFormat), [dayCutoffHour, timeFormat]);
  const progress = dayCutoffHour / MAX_CUTOFF_HOUR;
  const thumbLeft = trackWidth > 0 ? progress * trackWidth - THUMB_SIZE / 2 : -THUMB_SIZE / 2;

  const updateFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) return;
      const nextValue = clampCutoffHour((x / trackWidth) * MAX_CUTOFF_HOUR);
      if (nextValue !== dayCutoffHour) setDayCutoffHour(nextValue);
    },
    [dayCutoffHour, setDayCutoffHour, trackWidth],
  );

  const handleResponder = useCallback(
    (event: GestureResponderEvent) => {
      updateFromX(event.nativeEvent.pageX - trackX);
    },
    [trackX, updateFromX],
  );

  const measureSlider = useCallback(() => {
    sliderRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackX(pageX);
      setTrackWidth(width);
    });
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DAY CUTOFF</Text>
      <View style={styles.card}>
        <View style={styles.valueRow}>
          <Text style={styles.label}>Start new day at</Text>
          <Text style={styles.value}>{label}</Text>
        </View>

        <View
          ref={sliderRef}
          style={styles.sliderHitArea}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Day cutoff"
          accessibilityValue={{ min: MIN_CUTOFF_HOUR, max: MAX_CUTOFF_HOUR, now: dayCutoffHour, text: label }}
          accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
          onAccessibilityAction={event => {
            if (event.nativeEvent.actionName === 'increment') {
              setDayCutoffHour(clampCutoffHour(dayCutoffHour + 1));
            }
            if (event.nativeEvent.actionName === 'decrement') {
              setDayCutoffHour(clampCutoffHour(dayCutoffHour - 1));
            }
          }}
          onLayout={measureSlider}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderStart={measureSlider}
          onResponderGrant={handleResponder}
          onResponderMove={handleResponder}
        >
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={[styles.thumb, { left: thumbLeft }]} />
        </View>

        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>{formatCutoffHour(MIN_CUTOFF_HOUR, timeFormat)}</Text>
          <Text style={styles.rangeLabel}>{formatCutoffHour(MAX_CUTOFF_HOUR, timeFormat)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 15,
    flex: 1,
  },
  value: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sliderHitArea: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.bg.input,
  },
  trackFill: {
    height: '100%',
    backgroundColor: Colors.text.primary,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.text.primary,
    borderWidth: 3,
    borderColor: Colors.bg.card,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
