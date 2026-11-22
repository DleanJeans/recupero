import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimePicker } from '../../screens/behavior-screen/components/time-picker';
import type { ContactKind } from '../../types/person';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import { formatEndDateLabel, getTimeOfDaySeconds, getTimeRangeDurationMs } from '../../utils/log-utils';
import { CONTACT_AMOUNTS, CONTACT_EMOJIS, CONTACT_LABELS, getContactTimes } from '../../utils/people-utils';
import { formatDuration } from '../../utils/time-utils';
import { Button } from '../button';
import { DatePicker } from '../date-picker';
import { Text } from '../text';

interface ContactLogDialogProps {
  personName: string;
  kind: ContactKind;
  /** Called with the chosen start and end of the contact (ms) after the user confirms. */
  onConfirm: (startTs: number, endTs: number) => void;
  onClose: () => void;
}

const DAY_END_SECONDS = 23 * 3600 + 59 * 60;

/** Asks when a contact happened (date, start, end) before it is logged. Defaults to today, now. */
export function ContactLogDialog({ personName, kind, onConfirm, onClose }: ContactLogDialogProps) {
  const insets = useSafeAreaInsets();
  const [now] = useState(() => new Date());
  const todayStr = toDateString(now, 0);
  const nowSeconds = Math.floor(getTimeOfDaySeconds(now.getTime()) / 60) * 60;
  const [date, setDate] = useState(todayStr);
  const [startSeconds, setStartSeconds] = useState(nowSeconds);
  const [endSeconds, setEndSeconds] = useState(nowSeconds);

  const isToday = date === todayStr;
  const maxSeconds = isToday ? nowSeconds : DAY_END_SECONDS;
  const startClamped = Math.min(startSeconds, maxSeconds);
  const endClamped = Math.min(endSeconds, maxSeconds);
  const times = getContactTimes(date, startClamped, endClamped, now.getTime());
  const durationMs = getTimeRangeDurationMs(startClamped, endClamped);

  const renderPicker = (label: string, seconds: number, onChange: (seconds: number) => void) => (
    <TimePicker
      label={label}
      hour={Math.floor(seconds / 3600)}
      minute={Math.floor((seconds % 3600) / 60)}
      second={0}
      maxHour={Math.floor(maxSeconds / 3600)}
      maxMinute={Math.floor((maxSeconds % 3600) / 60)}
      maxSecond={0}
      showSeconds={false}
      onTimeChange={onChange}
    />
  );

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {`${CONTACT_EMOJIS[kind]} ${CONTACT_LABELS[kind]} · ${personName}`}
          </Text>
          <Text style={styles.label}>Date</Text>
          <DatePicker
            selectedDate={date}
            maxDate={todayStr}
            onSelect={setDate}
          />
          <View style={[styles.timeRow, times.endsNextDay && styles.timeRowNextDay]}>
            <View style={styles.timeColumn}>{renderPicker('Start', startClamped, setStartSeconds)}</View>
            <Text style={styles.separator}>-</Text>
            <View style={styles.timeColumn}>
              {renderPicker('End', endClamped, setEndSeconds)}
              {times.endsNextDay ? (
                <Text
                  style={styles.nextDay}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {`Next day · ${formatEndDateLabel(times.endTs)}`}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.durationCard}>
            <Text style={styles.durationLabel}>Duration</Text>
            <Text
              style={styles.durationValue}
              numberOfLines={1}
            >
              {formatDuration(durationMs, false)}
            </Text>
          </View>
          <Text style={styles.amount}>{`Social +${CONTACT_AMOUNTS[kind]}%`}</Text>
          <View style={styles.actions}>
            <View style={styles.flex} />
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onPress={() => onConfirm(times.startTs, times.endTs)}
            >
              Log
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  flex: { flex: 1 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  label: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeRowNextDay: { marginBottom: 20 },
  timeColumn: { flex: 1, minWidth: 0 },
  separator: { color: Colors.text.primary, fontSize: 28, marginTop: 8 },
  nextDay: {
    color: Colors.text.light,
    fontSize: 13,
    textAlign: 'center',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
  },
  durationCard: {
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 2,
  },
  durationLabel: { color: Colors.text.faint, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  durationValue: { color: Colors.text.primary, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  amount: { color: Colors.type.desirable, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
