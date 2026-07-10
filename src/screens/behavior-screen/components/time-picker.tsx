import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

const IS_ANDROID = process.env.EXPO_OS === 'android';

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  collapsed: boolean;
  onMinuteChange: (m: number) => void;
  onExpand: () => void;
}

function TimePickerComponent({
  label,
  hour,
  minute,
  maxHour,
  maxMinute,
  collapsed,
  onMinuteChange,
  onExpand,
}: TimePickerProps) {
  const value = useMemo(() => new Date(2000, 0, 1, hour, minute), [hour, minute]);
  const maximumDate = useMemo(() => new Date(2000, 0, 1, maxHour, maxMinute), [maxHour, maxMinute]);
  const displayTime = useMemo(
    () => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    [hour, minute],
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
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
