import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { setTimeOfDay } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';

const IS_ANDROID = process.env.EXPO_OS === 'android';

interface SunlightTimeFieldProps {
  label: string;
  value: number;
  onChange: (ts: number) => void;
}

/** A clock time on the session's own day: the Android time dialog, or the compact picker elsewhere. */
export function SunlightTimeField({ label, value, onChange }: SunlightTimeFieldProps) {
  const pick = (date: Date | undefined) => {
    if (date) onChange(setTimeOfDay(value, date.getHours(), date.getMinutes()));
  };
  const open = () =>
    DateTimePickerAndroid.open({
      value: new Date(value),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set') pick(date);
      },
    });

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {IS_ANDROID ? (
        <Pressable
          style={({ pressed }) => [styles.value, pressed && styles.pressed]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${formatTime(value)}`}
        >
          <Text style={styles.valueText}>{formatTime(value)}</Text>
        </Pressable>
      ) : (
        <DateTimePicker
          value={new Date(value)}
          mode="time"
          display="compact"
          onChange={(_, date) => pick(date)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  value: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  valueText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
