import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { memo, useCallback, useMemo } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';

const IS_ANDROID = process.env.EXPO_OS === 'android';

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  second: number;
  maxHour: number;
  maxMinute: number;
  maxSecond: number;
  showSeconds: boolean;
  collapsed: boolean;
  onMinuteChange: (m: number) => void;
  onSecondChange: (s: number) => void;
  onExpand: () => void;
}

function TimePickerComponent({
  label,
  hour,
  minute,
  second,
  maxHour,
  maxMinute,
  maxSecond,
  showSeconds,
  collapsed,
  onMinuteChange,
  onSecondChange,
  onExpand,
}: TimePickerProps) {
  const value = useMemo(() => new Date(2000, 0, 1, hour, minute, second), [hour, minute, second]);
  const maximumDate = useMemo(
    () => new Date(2000, 0, 1, maxHour, maxMinute, maxSecond),
    [maxHour, maxMinute, maxSecond],
  );
  const displayTime = useMemo(
    () =>
      showSeconds
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
        : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    [hour, minute, second, showSeconds],
  );
  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed' || !selectedDate) return;
      const selectedMinutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const maxMinutes = maxHour * 60 + maxMinute;
      onMinuteChange(Math.min(selectedMinutes, maxMinutes) - hour * 60);
    },
    [hour, maxHour, maxMinute, onMinuteChange],
  );
  const handlePress = useCallback(() => {
    if (!IS_ANDROID) {
      onExpand();
      return;
    }
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      display: 'spinner',
      is24Hour: true,
      onChange: handleChange,
    });
  }, [handleChange, onExpand, value]);
  const handleSecondChange = useCallback(
    (text: string) => {
      if (!/^\d{0,2}$/.test(text) || text === '') return;
      onSecondChange(Math.min(Number(text), maxSecond));
    },
    [maxSecond, onSecondChange],
  );
  const handleSecondSubmit = useCallback(() => Keyboard.dismiss(), []);

  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Pressable
        style={[styles.collapsedTime, !IS_ANDROID && !collapsed && styles.hiddenControl]}
        onPress={handlePress}
        pointerEvents={IS_ANDROID || collapsed ? 'auto' : 'none'}
      >
        <Text style={styles.collapsedTimeText}>{displayTime}</Text>
      </Pressable>
      {!IS_ANDROID && (
        <View style={[styles.pickerContainer, collapsed && styles.hiddenControl]}>
          <DateTimePicker
            value={value}
            maximumDate={maximumDate}
            mode="time"
            display="spinner"
            minuteInterval={1}
            themeVariant="dark"
            textColor={Colors.text.primary}
            onChange={handleChange}
            style={styles.picker}
          />
        </View>
      )}
      {showSeconds && (
        <View style={styles.secondsEditor}>
          <Text style={styles.secondsLabel}>Seconds</Text>
          <TextInput
            accessibilityLabel={`${label} seconds`}
            style={styles.secondsInput}
            value={String(second).padStart(2, '0')}
            onChangeText={handleSecondChange}
            onSubmitEditing={handleSecondSubmit}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
        </View>
      )}
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
    textAlign: 'center',
  },
  collapsedTime: { alignItems: 'center', marginBottom: 16 },
  hiddenControl: { height: 0, marginBottom: 0, opacity: 0, overflow: 'hidden' },
  pickerContainer: { height: 216, marginBottom: 16, overflow: 'hidden' },
  picker: { height: 216 },
  secondsEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondsLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  secondsInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    color: Colors.text.primary,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
