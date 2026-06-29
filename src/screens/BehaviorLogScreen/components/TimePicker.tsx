import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';
import { NumberWheel } from './NumberWheel';

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface TimePickerProps {
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  wheelKey: number;
  collapsed: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onExpand: () => void;
}

function TimePickerComponent({
  hour,
  minute,
  maxHour,
  maxMinute,
  wheelKey,
  collapsed,
  onHourChange,
  onMinuteChange,
  onExpand,
}: TimePickerProps) {
  const hourValues = useMemo(() => ALL_HOURS.slice(0, maxHour + 1), [maxHour]);
  const minuteValues = useMemo(() => ALL_MINUTES.slice(0, maxMinute + 1), [maxMinute]);
  const displayTime = useMemo(
    () => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    [hour, minute],
  );

  return (
    <>
      <Text style={styles.sectionLabel}>Time</Text>
      <Pressable
        style={[styles.collapsedTime, !collapsed && styles.hiddenControl]}
        onPress={onExpand}
        pointerEvents={collapsed ? 'auto' : 'none'}
      >
        <Text style={styles.collapsedTimeText}>{displayTime}</Text>
      </Pressable>
      <View style={[styles.wheels, collapsed && styles.hiddenWheels]}>
        <View
          style={[styles.wheelsContent, collapsed && styles.hiddenControl]}
          pointerEvents={collapsed ? 'none' : 'auto'}
        >
          <NumberWheel
            resetKey={wheelKey}
            values={hourValues}
            initialIndex={Math.min(hour, maxHour)}
            onChange={onHourChange}
          />
          <Text style={styles.colon}>:</Text>
          <NumberWheel
            resetKey={wheelKey}
            values={minuteValues}
            initialIndex={Math.min(minute, maxMinute)}
            onChange={onMinuteChange}
          />
        </View>
      </View>
    </>
  );
}

export const TimePicker = memo(TimePickerComponent);

const styles = StyleSheet.create({
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  wheels: { marginBottom: 16, overflow: 'hidden' },
  wheelsContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  colon: { color: Colors.text.primary, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  collapsedTime: { alignItems: 'center', marginBottom: 16 },
  hiddenWheels: { height: 0, marginBottom: 0 },
  hiddenControl: { height: 0, marginBottom: 0, opacity: 0, overflow: 'hidden' },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
