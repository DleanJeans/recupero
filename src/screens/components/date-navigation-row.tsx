import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DatePicker } from '../../components/date-picker';
import type { CalendarDayMetrics, CalendarDayMetricType } from '../../utils/calendar-metrics';
import { Colors } from '../../utils/colors';

interface DateNavigationRowProps {
  selectedDate: string;
  maxDate?: string;
  dayMetrics?: CalendarDayMetrics;
  dayMetricType?: CalendarDayMetricType;
  nextDisabled?: boolean;
  onSelect: (date: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function DateNavigationRow({
  selectedDate,
  maxDate,
  dayMetrics,
  dayMetricType,
  nextDisabled = false,
  onSelect,
  onPrevious,
  onNext,
}: DateNavigationRowProps) {
  return (
    <View style={styles.dateRow}>
      <Pressable
        onPress={onPrevious}
        style={styles.arrowBtn}
        hitSlop={8}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={Colors.text.primary}
        />
      </Pressable>

      <View style={styles.dateLabelWrap}>
        <DatePicker
          selectedDate={selectedDate}
          maxDate={maxDate}
          dayMetrics={dayMetrics}
          dayMetricType={dayMetricType}
          onSelect={onSelect}
        />
      </View>

      <Pressable
        onPress={onNext}
        style={[styles.arrowBtn, nextDisabled && styles.arrowDisabled]}
        hitSlop={8}
        disabled={nextDisabled}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={nextDisabled ? Colors.text.dim : Colors.text.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  arrowBtn: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 12,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  dateLabelWrap: {
    flex: 1,
  },
});
