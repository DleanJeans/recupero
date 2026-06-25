import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Colors } from '../utils/colors';
import { formatDateDisplay } from '../utils/dateUtils';
import { Text } from './Text';

interface DatePickerProps {
  selectedDate: string;
  maxDate?: string;
  minDate?: string;
  onSelect: (dateStr: string) => void;
}

export function DatePicker({ selectedDate, maxDate, minDate, onSelect }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.dateField}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.dateFieldText}>{formatDateDisplay(selectedDate)}</Text>
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
  dateFieldText: { color: Colors.text.primary, fontSize: 16, fontWeight: '500' },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarPopup: { width: '100%', backgroundColor: Colors.bg.input, borderRadius: 16, overflow: 'hidden' },
});
