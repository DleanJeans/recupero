import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
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
  initialNotes?: string;
  onClose: () => void;
}

export function BehaviorLogModal({ behavior, visible, logId, initialTimestamp, initialNotes, onClose }: Props) {
  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hour, setHour] = useState(nowRef.current.getHours());
  const [minute, setMinute] = useState(nowRef.current.getMinutes());
  const [wheelKey, setWheelKey] = useState(0);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [notesFocused, setNotesFocused] = useState(false);

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
      setNotes(initialNotes ?? '');
      setWheelKey(k => k + 1);
    }
  }, [visible, initialTimestamp, initialNotes]);

  const { logBehavior, updateLog } = useBehaviorStore();

  const handleConfirm = useCallback(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
    const metadata = notes.trim() ? { notes: notes.trim() } : undefined;
    if (logId) {
      updateLog(behavior.id, logId, ts, metadata);
    } else {
      logBehavior(behavior.id, ts, metadata);
    }
    onClose();
  }, [selectedDate, hour, minute, notes, logId, behavior.id, logBehavior, updateLog, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.sheet}>
        <ModalTitle isEditing={!!initialTimestamp} behaviorName={behavior.name} />

        <DatePicker selectedDate={selectedDate} maxDate={todayStr} onSelect={setSelectedDate} />

        <TimePicker
          hour={hour}
          minute={minute}
          maxHour={maxHour}
          maxMinute={maxMinute}
          wheelKey={wheelKey}
          collapsed={notesFocused}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor={Colors.text.dim}
          multiline
          maxLength={500}
          textAlignVertical="top"
          onFocus={() => setNotesFocused(true)}
          onBlur={() => setNotesFocused(false)}
        />

        <ActionButtons confirmLabel={initialTimestamp ? 'Save' : 'Log'} onCancel={onClose} onConfirm={handleConfirm} />
      </KeyboardAvoidingView>
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
        <Ionicons name="calendar-outline" size={18} color={Colors.text.light} />
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
              markedDates={{ [selectedDate]: { selected: true, selectedColor: Colors.text.primary, selectedTextColor: Colors.bg.black } }}
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

interface TimePickerProps {
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  wheelKey: number;
  collapsed: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}

function TimePicker({ hour, minute, maxHour, maxMinute, wheelKey, collapsed, onHourChange, onMinuteChange }: TimePickerProps) {
  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

  if (collapsed) {
    const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return (
      <>
        <Text style={styles.sectionLabel}>Time</Text>
        <View style={styles.collapsedTime}>
          <Text style={styles.collapsedTimeText}>{displayTime}</Text>
        </View>
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
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: { color: Colors.text.primary, fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  sectionLabel: {
    color: Colors.text.light,
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
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
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
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  colon: { color: Colors.text.primary, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  notesInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text.primary,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    lineHeight: 22,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  collapsedTime: {
    alignItems: 'center',
    marginBottom: 16,
  },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
