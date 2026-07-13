import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
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
  const [editingSeconds, setEditingSeconds] = useState(false);
  const value = useMemo(() => new Date(2000, 0, 1, hour, minute, second), [hour, minute, second]);
  const maximumDate = useMemo(
    () => new Date(2000, 0, 1, maxHour, maxMinute, maxSecond),
    [maxHour, maxMinute, maxSecond],
  );
  const pickerValue = useMemo(
    () => (editingSeconds ? new Date(2000, 0, 1, 0, second) : value),
    [editingSeconds, second, value],
  );
  const pickerMaximumDate = useMemo(
    () => (editingSeconds ? new Date(2000, 0, 1, 0, maxSecond) : maximumDate),
    [editingSeconds, maxSecond, maximumDate],
  );
  const pickerMinimumDate = useMemo(() => new Date(2000, 0, 1), []);
  const displayTime = useMemo(
    () =>
      showSeconds
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
        : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    [hour, minute, second, showSeconds],
  );
  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate: Date | undefined, secondsMode: boolean) => {
      if (event.type === 'dismissed' || !selectedDate) return;
      if (secondsMode) {
        onSecondChange(Math.min(selectedDate.getMinutes(), maxSecond));
        return;
      }
      const selectedMinutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const maxMinutes = maxHour * 60 + maxMinute;
      onMinuteChange(Math.min(selectedMinutes, maxMinutes) - hour * 60);
    },
    [hour, maxHour, maxMinute, maxSecond, onMinuteChange, onSecondChange],
  );
  const handlePress = useCallback(() => {
    setEditingSeconds(false);
    if (!IS_ANDROID) {
      onExpand();
      return;
    }
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      display: 'spinner',
      is24Hour: true,
      minimumDate: pickerMinimumDate,
      maximumDate: maximumDate,
      onChange: (event, selectedDate) => handleChange(event, selectedDate, false),
    });
  }, [handleChange, maximumDate, onExpand, pickerMinimumDate, value]);
  const handleSecondPress = useCallback(() => {
    setEditingSeconds(true);
    if (!IS_ANDROID) {
      onExpand();
      return;
    }
    DateTimePickerAndroid.open({
      value: new Date(2000, 0, 1, 0, second),
      mode: 'time',
      display: 'spinner',
      is24Hour: true,
      minimumDate: pickerMinimumDate,
      maximumDate: new Date(2000, 0, 1, 0, maxSecond),
      onChange: (event, selectedDate) => handleChange(event, selectedDate, true),
    });
  }, [handleChange, maxSecond, onExpand, pickerMinimumDate, second]);

  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={[styles.collapsedTime, !IS_ANDROID && !collapsed && styles.hiddenControl]}>
        <Pressable
          onPress={handlePress}
          pointerEvents={IS_ANDROID || collapsed ? 'auto' : 'none'}
          accessibilityLabel={`${label} hours and minutes`}
        >
          <Text style={styles.collapsedTimeText}>{displayTime.slice(0, 5)}</Text>
        </Pressable>
        {showSeconds && (
          <>
            <Text style={styles.timeSeparator}>:</Text>
            <Pressable
              onPress={handleSecondPress}
              pointerEvents={IS_ANDROID || collapsed ? 'auto' : 'none'}
              accessibilityLabel={`${label} seconds`}
            >
              <Text style={styles.collapsedTimeText}>{displayTime.slice(-2)}</Text>
            </Pressable>
          </>
        )}
      </View>
      {!IS_ANDROID && (
        <View style={[styles.pickerContainer, collapsed && styles.hiddenControl]}>
          <DateTimePicker
            value={pickerValue}
            minimumDate={pickerMinimumDate}
            maximumDate={pickerMaximumDate}
            mode="time"
            display="spinner"
            minuteInterval={1}
            themeVariant="dark"
            textColor={Colors.text.primary}
            onChange={(event, selectedDate) => handleChange(event, selectedDate, editingSeconds)}
            style={styles.picker}
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
  collapsedTime: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  hiddenControl: { height: 0, marginBottom: 0, opacity: 0, overflow: 'hidden' },
  pickerContainer: { height: 216, marginBottom: 16, overflow: 'hidden' },
  picker: { height: 216 },
  timeSeparator: { color: Colors.text.primary, fontSize: 28, fontWeight: '700' },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
