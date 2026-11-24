import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import type { TaskBug, TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { BUG_TAGS, getBugCount, getBugHeat } from '../../../utils/task-bug-utils';
import { formatTime } from '../../../utils/time-utils';

const IS_ANDROID = process.env.EXPO_OS === 'android';

interface BugLogSheetProps {
  task: TaskEntry;
  onSave: (bug: TaskBug) => void;
  onClose: () => void;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`;
}

/** Sheet to log that a task bugged the user again: what happened (optional) and when. No keyboard unless a note is added. */
export function BugLogSheet({ task, onSave, onClose }: BugLogSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [tags, setTags] = useState<string[]>([]);
  /** When it happened; undefined means now (taken when saved). */
  const [at, setAt] = useState<number | undefined>();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const nextCount = getBugCount(task) + 1;
  const heatBefore = Math.min(100, Math.round((getBugHeat(task.bugs, Date.now()) / 4) * 100));

  const toggleTag = (tag: string) =>
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));

  /** Android: pick the day, then the time. A time in the future is held back to now when saved. */
  const pickTime = () => {
    const start = new Date(at ?? Date.now());
    if (!IS_ANDROID) {
      setAt(start.getTime());
      return;
    }
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (dateEvent, day) => {
        if (dateEvent.type !== 'set' || !day) return;
        DateTimePickerAndroid.open({
          value: start,
          mode: 'time',
          is24Hour: false,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return;
            const picked = new Date(day);
            picked.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setAt(Math.min(picked.getTime(), Date.now()));
          },
        });
      },
    });
  };

  const handleSave = () => {
    const trimmed = note.trim();
    onSave({
      at: Math.min(at ?? Date.now(), Date.now()),
      note: trimmed || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardVisible && { justifyContent: 'flex-start', paddingTop: insets.top }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            keyboardVisible
              ? styles.sheetTop
              : { paddingBottom: 16 + insets.bottom, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
          ]}
        >
          {!keyboardVisible && <View style={styles.grabber} />}
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            😣 {task.title}
          </Text>
          <Text
            style={styles.subtitle}
            numberOfLines={1}
          >
            {`${ordinal(nextCount)} time · heat ${heatBefore}%`}
          </Text>

          <Text style={styles.label}>WHAT HAPPENED</Text>
          <View style={styles.chips}>
            {BUG_TAGS.map(tag => (
              <Chip
                key={tag}
                label={tag}
                on={tags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
            {!noteOpen && (
              <Chip
                label={note ? '✏️ Note added' : '✏️ Note…'}
                on={note.length > 0}
                onPress={() => setNoteOpen(true)}
              />
            )}
          </View>
          {noteOpen && (
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="What happened?"
              placeholderTextColor={Colors.text.faint}
              autoFocus
              returnKeyType="done"
            />
          )}

          <Text style={styles.label}>WHEN</Text>
          <View style={styles.chips}>
            <Chip
              label="Now"
              on={at === undefined}
              onPress={() => setAt(undefined)}
            />
            <Chip
              label={
                at === undefined
                  ? 'Pick date & time'
                  : `${new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${formatTime(at)}`
              }
              on={at !== undefined}
              onPress={pickTime}
            />
            {!IS_ANDROID && at !== undefined && (
              <DateTimePicker
                value={new Date(at)}
                mode="datetime"
                maximumDate={new Date()}
                onChange={(_, date) => date && setAt(date.getTime())}
              />
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.spacer} />
            <Button
              variant="ghost"
              size="sm"
              onPress={onClose}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={handleSave}
              style={styles.button}
            >
              Log it
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ChipProps {
  label: string;
  on: boolean;
  onPress: () => void;
}

function Chip({ label, on, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text
        style={[styles.chipText, on && styles.chipTextOn]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetTop: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingTop: 16, paddingBottom: 16 },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.dim,
    marginBottom: 14,
  },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '600' },
  subtitle: { color: Colors.text.muted, fontSize: 12.5, marginTop: 2 },
  label: { color: Colors.text.muted, fontSize: 11, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#3A1D0E', borderWidth: 1, borderColor: '#7C2D12' },
  chipText: { color: Colors.text.secondary, fontSize: 13 },
  chipTextOn: { color: '#FDBA74' },
  input: {
    marginTop: 10,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    fontSize: 15,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  spacer: { flex: 1 },
  button: { minWidth: 90 },
});
