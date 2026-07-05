import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { CalendarProps } from 'react-native-calendars';
import { Calendar } from 'react-native-calendars';
import { useSettingsStore } from '../store/settings-store';
import type { CalendarDayMetrics, CalendarDayMetricType } from '../utils/calendar-metrics';
import { Colors } from '../utils/colors';
import { describeDay, formatDateDisplay } from '../utils/date-utils';
import { CalendarMetricDay } from './calendar-metric-day';
import { Text } from './text';

interface DatePickerProps {
  selectedDate: string;
  maxDate?: string;
  minDate?: string;
  dayMetrics?: CalendarDayMetrics;
  dayMetricType?: CalendarDayMetricType;
  onSelect: (dateStr: string) => void;
}

type CalendarDayComponentProps = React.ComponentProps<NonNullable<CalendarProps['dayComponent']>>;

export function DatePicker({ selectedDate, maxDate, minDate, dayMetrics, dayMetricType, onSelect }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const dayDescription = describeDay(selectedDate, dayCutoffHour);
  const renderCalendarDay = useCallback(
    (props: CalendarDayComponentProps) => (
      <CalendarMetricDay
        {...props}
        metric={props.date ? dayMetrics?.[props.date.dateString] : undefined}
        metricType={dayMetricType}
      />
    ),
    [dayMetricType, dayMetrics],
  );

  return (
    <>
      <Pressable
        style={styles.dateField}
        onPress={() => setOpen(true)}
      >
        <View style={styles.dateTextGroup}>
          <Text style={styles.dateFieldText}>{formatDateDisplay(selectedDate)}</Text>
          <Text style={styles.dateDescriptionText}>{dayDescription}</Text>
        </View>
        <Ionicons
          name="calendar-outline"
          size={18}
          color={Colors.text.light}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.calendarPopup}>
            <Calendar
              {...(maxDate ? { maxDate } : {})}
              {...(minDate ? { minDate } : {})}
              current={selectedDate}
              onDayPress={day => {
                onSelect(day.dateString);
                setOpen(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: Colors.text.primary,
                  selectedTextColor: Colors.bg.black,
                },
              }}
              {...(dayMetrics ? { dayComponent: renderCalendarDay } : {})}
              theme={{
                calendarBackground: Colors.bg.input,
                dayTextColor: Colors.text.primary,
                textDisabledColor: Colors.text.dim,
                monthTextColor: Colors.text.primary,
                arrowColor: Colors.text.primary,
                todayTextColor: Colors.text.light,
                selectedDayBackgroundColor: Colors.text.primary,
                selectedDayTextColor: Colors.bg.black,
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateTextGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateFieldText: { color: Colors.text.primary, fontSize: 16, fontWeight: '500' },
  dateDescriptionText: { color: Colors.text.light, fontSize: 10, fontWeight: '600' },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarPopup: { width: '100%', backgroundColor: Colors.bg.input, borderRadius: 16, overflow: 'hidden' },
});
