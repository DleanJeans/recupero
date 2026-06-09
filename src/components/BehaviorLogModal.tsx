import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import { formatDateDisplay, toDateString } from '../utils/dateUtils';
import { Button } from './Button';
import { NumberWheel } from './NumberWheel';
import { Text } from './Text';

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface Props {
  behavior: BehaviorEntry;
  visible: boolean;
  /** If provided, the modal updates the existing log instead of creating a new one. */
  logId?: string;
  initialTimestamp?: number;
  onClose: () => void;
}

export function BehaviorLogModal({ behavior, visible, logId, initialTimestamp, onClose }: Props) {
  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hour, setHour] = useState(nowRef.current.getHours());
  const [minute, setMinute] = useState(nowRef.current.getMinutes());
  const [wheelKey, setWheelKey] = useState(0);

  const isToday = selectedDate === todayStr;
  const maxHour = isToday ? nowRef.current.getHours() : 23;
  const maxMinute = isToday && hour === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59;

  useEffect(() => {
    if (hour > maxHour) setHour(maxHour);
  }, [maxHour]);

  useEffect(() => {
    if (minute > maxMinute) setMinute(maxMinute);
  }, [maxMinute]);

  useEffect(() => {
    if (visible) {
      const n = initialTimestamp ? new Date(initialTimestamp) : new Date();
      nowRef.current = new Date();
      setSelectedDate(toDateString(n));
      setHour(n.getHours());
      setMinute(n.getMinutes());
      setWheelKey(k => k + 1);
    }
  }, [visible, initialTimestamp]);

  const { logBehavior, updateLog } = useBehaviorStore();

  const handleConfirm = useCallback(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
    if (logId) {
      updateLog(behavior.id, logId, ts);
    } else {
      logBehavior(behavior.id, ts);
    }
    onClose();
  }, [selectedDate, hour, minute, logId, behavior.id, logBehavior, updateLog, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ModalTitle isEditing={!!initialTimestamp} behaviorName={behavior.name} />

        <DatePicker selectedDate={selectedDate} maxDate={todayStr} onSelect={setSelectedDate} />

        <TimePicker
          hour={hour}
          minute={minute}
          maxHour={maxHour}
          maxMinute={maxMinute}
          wheelKey={wheelKey}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />

        <ActionButtons confirmLabel={initialTimestamp ? 'Save' : 'Log'} onCancel={onClose} onConfirm={handleConfirm} />
      </View>
    </Modal>
  );
}

interface ModalTitleProps {
  isEditing: boolean;
  behaviorName: string;
}

function ModalTitle({ isEditing, behaviorName }: ModalTitleProps) {
  return <Text style={styles.title}>{isEditing ? 'Edit Time' : `Log ${behaviorName}`}</Text>;
}

interface DatePickerProps {
  selectedDate: string;
  maxDate: string;
  onSelect: (dateStr: string) => void;
}

function DatePicker({ selectedDate, maxDate, onSelect }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Text style={styles.sectionLabel}>Date</Text>
      <Pressable style={styles.dateField} onPress={() => setOpen(true)}>
        <Text style={styles.dateFieldText}>{formatDateDisplay(selectedDate)}</Text>
        <Ionicons name="calendar-outline" size={18} color="#aaa" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.calendarOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.calendarPopup}>
            <Calendar
              maxDate={maxDate}
              current={selectedDate}
              onDayPress={day => {
                onSelect(day.dateString);
                setOpen(false);
              }}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: '#fff', selectedTextColor: '#000' } }}
              theme={{
                calendarBackground: '#2a2a2a',
                dayTextColor: '#fff',
                textDisabledColor: '#555',
                monthTextColor: '#fff',
                arrowColor: '#fff',
                todayTextColor: '#aaa',
                selectedDayBackgroundColor: '#fff',
                selectedDayTextColor: '#000',
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

interface TimePickerProps {
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  wheelKey: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}

function TimePicker({ hour, minute, maxHour, maxMinute, wheelKey, onHourChange, onMinuteChange }: TimePickerProps) {
  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

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

function ActionButtons({
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Button variant="secondary" size="lg" onPress={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" size="lg" onPress={onConfirm}>
        {confirmLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  sectionLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  dateFieldText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarPopup: { width: '100%', backgroundColor: '#2a2a2a', borderRadius: 16, overflow: 'hidden' },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  colon: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
