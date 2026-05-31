import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Text } from './Text';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const local = date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isToday(date)) return `Today, ${local}`;
  if (isYesterday(date)) return `Yesterday, ${local}`;
  const distance = formatDistanceToNowStrict(date, { addSuffix: true });
  return `${distance.charAt(0).toUpperCase() + distance.slice(1)}, ${local}`;
}

interface WheelProps {
  values: string[];
  initialIndex: number;
  onChange: (index: number) => void;
}

function Wheel({ values, initialIndex, onChange }: WheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialIndex]);

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.max(
        0,
        Math.min(
          Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT),
          values.length - 1,
        ),
      );
      onChange(index);
    },
    [onChange, values.length],
  );

  return (
    <View style={wStyles.container}>
      <View
        style={wStyles.highlight}
        pointerEvents="none"
      />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map((v) => (
          <View
            key={v}
            style={wStyles.item}
          >
            <Text style={wStyles.text}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wStyles = StyleSheet.create({
  container: {
    width: 64,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ccc',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
});

interface Props {
  behaviorName: string;
  visible: boolean;
  onConfirm: (timestamp: number) => void;
  onCancel: () => void;
}

export function LogConfirmModal({
  behaviorName,
  visible,
  onConfirm,
  onCancel,
}: Props) {
  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hour, setHour] = useState(nowRef.current.getHours());
  const [minute, setMinute] = useState(nowRef.current.getMinutes());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [wheelKey, setWheelKey] = useState(0);

  const isToday = selectedDate === todayStr;
  const maxHour = isToday ? nowRef.current.getHours() : 23;
  const maxMinute =
    isToday && hour === nowRef.current.getHours()
      ? nowRef.current.getMinutes()
      : 59;

  useEffect(() => {
    if (hour > maxHour) setHour(maxHour);
  }, [maxHour]);

  useEffect(() => {
    if (minute > maxMinute) setMinute(maxMinute);
  }, [maxMinute]);

  useEffect(() => {
    if (visible) {
      const n = new Date();
      nowRef.current = n;
      setSelectedDate(toDateString(n));
      setHour(n.getHours());
      setMinute(n.getMinutes());
      setCalendarVisible(false);
      setWheelKey((k) => k + 1);
    }
  }, [visible]);

  const handleConfirm = useCallback(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
    onConfirm(ts);
  }, [selectedDate, hour, minute, onConfirm]);

  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
      />
      <View style={styles.sheet}>
        <Text style={styles.title}>Log "{behaviorName}"</Text>

        <Text style={styles.sectionLabel}>Date</Text>
        <Pressable
          style={styles.dateField}
          onPress={() => setCalendarVisible(true)}
        >
          <Text style={styles.dateFieldText}>
            {formatDateDisplay(selectedDate)}
          </Text>
          <Ionicons
            name="calendar-outline"
            size={18}
            color="#aaa"
          />
        </Pressable>

        <Text style={styles.sectionLabel}>Time</Text>
        <View style={styles.wheels}>
          <Wheel
            key={`hour-${wheelKey}-${maxHour}`}
            values={hourValues}
            initialIndex={Math.min(hour, maxHour)}
            onChange={setHour}
          />
          <Text style={styles.colon}>:</Text>
          <Wheel
            key={`min-${wheelKey}-${maxMinute}`}
            values={minuteValues}
            initialIndex={Math.min(minute, maxMinute)}
            onChange={setMinute}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.98 }] }]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>Log</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCalendarVisible(false)}
          />
          <View style={styles.calendarPopup}>
            <Calendar
              maxDate={todayStr}
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#fff',
                  selectedTextColor: '#000',
                },
              }}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
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
  dateFieldText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarPopup: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  colon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
