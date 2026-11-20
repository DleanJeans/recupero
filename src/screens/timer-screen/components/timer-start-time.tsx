import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatTime } from '../../../utils/time-utils';
import { resolveTimerStart } from '../../../utils/timer-utils';

const IS_ANDROID = process.env.EXPO_OS === 'android';

interface TimerStartTimeProps {
  startTimestamp: number;
  onChange: (timestamp: number) => void;
}

/** "since 5:08 AM" chip; tap to pick the start time with the system time picker. */
export function TimerStartTime({ startTimestamp, onChange }: TimerStartTimeProps) {
  const pick = (date: Date | undefined) => {
    if (date) onChange(resolveTimerStart(startTimestamp, date.getHours(), date.getMinutes(), Date.now()));
  };
  const open = () =>
    DateTimePickerAndroid.open({
      value: new Date(startTimestamp),
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type === 'set') pick(date);
      },
    });

  if (!IS_ANDROID) {
    return (
      <View style={styles.row}>
        <Text
          style={styles.text}
          numberOfLines={1}
        >
          since
        </Text>
        <DateTimePicker
          value={new Date(startTimestamp)}
          mode="time"
          display="compact"
          onChange={(_, date) => pick(date)}
        />
      </View>
    );
  }
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Started at ${formatTime(startTimestamp)}. Change start time`}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text
        style={styles.text}
        numberOfLines={1}
      >
        since {formatTime(startTimestamp)} ✎
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.bg.input,
  },
  pressed: { opacity: 0.7 },
  text: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
