import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CueBehaviorPicker } from '../../../components/cues/cue-behavior-picker';
import { CueSegmentedControl } from '../../../components/cues/cue-segmented-control';
import { Text, TextInput } from '../../../components/text';
import type { CueTrigger } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { cueTimeFromDate, dateFromCueTime } from '../../../utils/cue-utils';

type TimeTrigger = Extract<CueTrigger, { type: 'time' }>;

interface TimeTriggerEditorProps {
  value: TimeTrigger;
  onChange: (trigger: TimeTrigger) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function TimeTriggerEditor({ value, onChange }: TimeTriggerEditorProps) {
  const mode = value.mode;

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date || value.mode !== 'simple') return;
    onChange({ ...value, at: cueTimeFromDate(date) });
  };

  const openAndroidPicker = () => {
    if (value.mode !== 'simple') return;
    DateTimePickerAndroid.open({
      value: dateFromCueTime(value.at),
      mode: 'time',
      display: 'spinner',
      is24Hour: true,
      onChange: handleTimeChange,
    });
  };

  return (
    <View style={styles.editor}>
      <CueSegmentedControl
        value={mode}
        options={[
          { value: 'simple', label: 'Simple' },
          { value: 'auto', label: 'Auto' },
        ]}
        onChange={nextMode => {
          if (nextMode === 'simple') {
            const now = new Date();
            onChange({ type: 'time', mode: 'simple', at: cueTimeFromDate(now), repeatDays: [0, 1, 2, 3, 4, 5, 6] });
          } else {
            onChange({ type: 'time', mode: 'auto', pattern: 'wakeup' });
          }
        }}
      />

      {value.mode === 'simple' ? (
        <View style={styles.simpleEditor}>
          {process.env.EXPO_OS === 'android' ? (
            <Pressable
              style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
              onPress={openAndroidPicker}
            >
              <Text style={styles.timeValue}>{value.at}</Text>
            </Pressable>
          ) : (
            <View style={styles.iosPicker}>
              <DateTimePicker
                value={dateFromCueTime(value.at)}
                mode="time"
                display="spinner"
                minuteInterval={1}
                themeVariant="dark"
                textColor={Colors.text.primary}
                onChange={handleTimeChange}
              />
            </View>
          )}
          <Text style={styles.fieldLabel}>Repeat</Text>
          <View style={styles.days}>
            {DAY_LABELS.map((label, day) => {
              const selected = value.repeatDays.includes(day);
              return (
                <Pressable
                  key={`${label}-${day}`}
                  style={({ pressed }) => [styles.day, selected && styles.selectedDay, pressed && styles.pressed]}
                  onPress={() =>
                    onChange({
                      ...value,
                      repeatDays: selected
                        ? value.repeatDays.filter(item => item !== day)
                        : [...value.repeatDays, day].sort(),
                    })
                  }
                >
                  <Text style={[styles.dayLabel, selected && styles.selectedDayLabel]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.autoList}>
          <Pressable
            style={({ pressed }) => [
              styles.autoOption,
              value.pattern === 'wakeup' && styles.selectedAutoOption,
              pressed && styles.pressed,
            ]}
            onPress={() => onChange({ type: 'time', mode: 'auto', pattern: 'wakeup' })}
          >
            <Text style={styles.autoEmoji}>☀️</Text>
            <View style={styles.autoCopy}>
              <Text style={styles.autoTitle}>Wake-up</Text>
              <Text style={styles.autoDetail}>First significant morning activity</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.autoOption,
              value.pattern === 'afterBehavior' && styles.selectedAutoOption,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              onChange({
                type: 'time',
                mode: 'auto',
                pattern: 'afterBehavior',
                behaviorId: value.pattern === 'afterBehavior' ? value.behaviorId : '',
                delayMin: value.pattern === 'afterBehavior' ? value.delayMin : 15,
              })
            }
          >
            <Text style={styles.autoEmoji}>⏱️</Text>
            <View style={styles.autoCopy}>
              <Text style={styles.autoTitle}>After a behaviour</Text>
              <Text style={styles.autoDetail}>Wait a chosen number of minutes</Text>
            </View>
          </Pressable>
          {value.pattern === 'afterBehavior' && (
            <View style={styles.afterEditor}>
              <CueBehaviorPicker
                selectedIds={value.behaviorId ? [value.behaviorId] : []}
                multiple={false}
                onChange={ids => onChange({ ...value, behaviorId: ids[0] ?? '' })}
              />
              <View style={styles.delayRow}>
                <Text style={styles.delayLabel}>Delay</Text>
                <TextInput
                  style={styles.delayInput}
                  value={String(value.delayMin)}
                  onChangeText={text => onChange({ ...value, delayMin: Math.max(0, Number.parseInt(text, 10) || 0) })}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.delayUnit}>minutes</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 12 },
  simpleEditor: { gap: 10 },
  timeButton: { alignItems: 'center', backgroundColor: Colors.bg.input, borderRadius: 12, paddingVertical: 18 },
  timeValue: { color: Colors.text.primary, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  iosPicker: { height: 180, overflow: 'hidden', justifyContent: 'center' },
  fieldLabel: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  selectedDay: { backgroundColor: Colors.star.filled },
  dayLabel: { color: Colors.text.faint, fontSize: 12, fontWeight: '800' },
  selectedDayLabel: { color: Colors.bg.black },
  autoList: { gap: 8 },
  autoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.bg.input,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    padding: 12,
  },
  selectedAutoOption: { backgroundColor: `${Colors.star.filled}12`, borderColor: Colors.star.filled },
  autoEmoji: { width: 30, fontSize: 22, textAlign: 'center' },
  autoCopy: { flex: 1, gap: 2 },
  autoTitle: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  autoDetail: { color: Colors.text.faint, fontSize: 11 },
  afterEditor: { gap: 8, paddingTop: 2 },
  delayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  delayLabel: { flex: 1, color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  delayInput: {
    width: 56,
    height: 38,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  delayUnit: { color: Colors.text.faint, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
