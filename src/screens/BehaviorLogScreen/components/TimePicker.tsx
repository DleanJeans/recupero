import React from 'react';
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

export function TimePicker({
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
  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

  if (collapsed) {
    const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return (
      <>
        <Text style={styles.sectionLabel}>Time</Text>
        <Pressable
          style={styles.collapsedTime}
          onPress={onExpand}
        >
          <Text style={styles.collapsedTimeText}>{displayTime}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Time</Text>
      <View style={styles.wheels}>
        <NumberWheel
          key={`hour-${wheelKey}-${maxHour}`}
          values={hourValues}
          initialIndex={Math.min(hour, maxHour)}
          onChange={onHourChange}
        />
        <Text style={styles.colon}>:</Text>
        <NumberWheel
          key={`min-${wheelKey}-${maxMinute}`}
          values={minuteValues}
          initialIndex={Math.min(minute, maxMinute)}
          onChange={onMinuteChange}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  colon: { color: Colors.text.primary, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  collapsedTime: { alignItems: 'center', marginBottom: 16 },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
