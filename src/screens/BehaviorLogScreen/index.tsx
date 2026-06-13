import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { BehaviorTitle } from '../../components/BehaviorTitle';
import { Button } from '../../components/Button';
import { Text, TextInput } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { formatDateDisplay, toDateString } from '../../utils/dateUtils';
import { NumberWheel } from './components/NumberWheel';

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function BehaviorLogScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BehaviorLog'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId, logId, initialTimestamp, initialNotes: routeNotes } = route.params;

  const { behaviors, categories, logBehavior, updateLog } = useBehaviorStore();
  const behavior = behaviors.find(b => b.id === behaviorId);

  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hour, setHour] = useState(nowRef.current.getHours());
  const [minute, setMinute] = useState(nowRef.current.getMinutes());
  const [wheelKey, setWheelKey] = useState(0);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(routeNotes ?? '');
  const [notesFocused, setNotesFocused] = useState(false);
  const [metadataFocused, setMetadataFocused] = useState(false);
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>({});

  const category = behavior ? categories.find(c => c.id === behavior.categoryId) : undefined;
  const metadataFields = category?.metadataFields ?? [];

  // Load metadata values from existing log when editing, or defaults when new
  useEffect(() => {
    if (logId) {
      const existingLog = behavior?.logs.find(l => l.id === logId);
      if (existingLog?.metadata) {
        const vals: Record<string, string> = {};
        for (const field of metadataFields) {
          const v = existingLog.metadata[field.key];
          if (v != null) vals[field.key] = String(v);
        }
        setMetadataValues(vals);
      }
    } else if (behavior?.defaultMetadata) {
      const vals: Record<string, string> = {};
      for (const field of metadataFields) {
        const v = behavior.defaultMetadata[field.key];
        if (v != null) vals[field.key] = String(v);
      }
      setMetadataValues(vals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  const isToday = selectedDate === todayStr;
  const maxHour = isToday ? nowRef.current.getHours() : 23;
  const maxMinute = isToday && hour === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59;

  useEffect(() => {
    if (hour > maxHour) setHour(maxHour);
  }, [maxHour, hour]);

  useEffect(() => {
    if (minute > maxMinute) setMinute(maxMinute);
  }, [maxMinute, minute]);

  useEffect(() => {
    const n = initialTimestamp ? new Date(initialTimestamp) : new Date();
    nowRef.current = new Date();
    setSelectedDate(toDateString(n));
    setHour(n.getHours());
    setMinute(n.getMinutes());
    setNotes(routeNotes ?? '');
    setWheelKey(k => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTimestamp]);

  const handleExpandTime = useCallback(() => {
    notesRef.current?.blur();
    Keyboard.dismiss();
    setNotesFocused(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
    const metadata: Record<string, string | number> = {};
    if (notes.trim()) metadata.notes = notes.trim();
    for (const field of metadataFields) {
      const val = metadataValues[field.key];
      if (val !== undefined && val !== '') {
        metadata[field.key] = Number(val);
      }
    }
    const metadataOrUndefined = Object.keys(metadata).length > 0 ? metadata : undefined;
    if (logId) {
      // Edit: no logCount change, go back immediately
      updateLog(behaviorId, logId, ts, metadataOrUndefined);
      navigation.goBack();
      return;
    }

    logBehavior(behaviorId, ts, metadataOrUndefined);
    navigation.goBack();
  }, [
    selectedDate,
    hour,
    minute,
    notes,
    metadataValues,
    metadataFields,
    logId,
    behaviorId,
    logBehavior,
    updateLog,
    navigation,
  ]);

  if (!behavior) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Behavior Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEditing = !!initialTimestamp;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
      >
        <View style={styles.header}>
          <BackButton />
          <BehaviorTitle
            behavior={behavior}
            titleOverride={isEditing ? 'Edit Time' : undefined}
          />
        </View>

        <View style={styles.body}>
          <DatePicker
            selectedDate={selectedDate}
            maxDate={todayStr}
            onSelect={setSelectedDate}
          />

          <TimePicker
            hour={hour}
            minute={minute}
            maxHour={maxHour}
            maxMinute={maxMinute}
            wheelKey={wheelKey}
            collapsed={notesFocused || metadataFocused}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            onExpand={handleExpandTime}
          />

          {metadataFields.map(field => (
            <View
              key={field.key}
              style={styles.metadataFieldRow}
            >
              <Text style={styles.metadataFieldLabel}>
                {field.label}
                {field.unit ? ` (${field.unit})` : ''}
              </Text>
              <TextInput
                style={styles.metadataInput}
                value={metadataValues[field.key] ?? ''}
                onChangeText={v => setMetadataValues(prev => ({ ...prev, [field.key]: v.replace(/[^0-9.]/g, '') }))}
                onFocus={() => setMetadataFocused(true)}
                onBlur={() => setMetadataFocused(false)}
                placeholder="0"
                placeholderTextColor={Colors.text.dim}
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={8}
              />
            </View>
          ))}

          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            ref={notesRef}
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
        </View>
      </KeyboardAvoidingView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          style={styles.primaryAction}
          onPress={handleConfirm}
        >
          {isEditing ? 'Save' : 'Log'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

// #region Sub-components

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
              maxDate={maxDate}
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

interface TimePickerProps {
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  wheelKey: number;
  collapsed: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onExpand: () => void;
}

function TimePicker({
  hour,
  minute,
  maxHour,
  maxMinute,
  wheelKey,
  collapsed,
  onHourChange,
  onMinuteChange,
  onExpand,
}: TimePickerProps) {
  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

  if (collapsed) {
    const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return (
      <>
        <Text style={styles.sectionLabel}>Time</Text>
        <Pressable
          style={styles.collapsedTime}
          onPress={onExpand}
        >
          <Text style={styles.collapsedTimeText}>{displayTime}</Text>
        </Pressable>
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

// #endregion

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
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
  metadataFieldRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  metadataFieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  metadataInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
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
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  primaryAction: { flex: 0, width: '100%' },
});
