import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { formatEmptyHours } from '../../utils/need-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';

const MIN_HOURS = 0.1;
const MAX_HOURS = 24 * 60;

function toText(value: number): string {
  return String(Number(value.toFixed(2)));
}

interface NeedRateDialogProps {
  /** Current hours from full to empty. */
  emptyHours: number;
  onSubmit: (emptyHours: number) => void;
  onClose: () => void;
}

/** Sets a need's full-to-empty time by hand: type the duration or the minutes per 1%, the other follows. */
export function NeedRateDialog({ emptyHours, onSubmit, onClose }: NeedRateDialogProps) {
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const [hoursText, setHoursText] = useState(toText(emptyHours));
  const [minutesText, setMinutesText] = useState(toText((emptyHours * 60) / 100));
  const hours = parseDecimalInput(hoursText);
  const valid = hours != null && hours >= MIN_HOURS && hours <= MAX_HOURS;

  const onHoursChange = (text: string) => {
    setHoursText(text);
    const parsed = parseDecimalInput(text);
    setMinutesText(parsed != null && parsed > 0 ? toText((parsed * 60) / 100) : '');
  };
  const onMinutesChange = (text: string) => {
    setMinutesText(text);
    const parsed = parseDecimalInput(text);
    setHoursText(parsed != null && parsed > 0 ? toText((parsed * 100) / 60) : '');
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          keyboardUp && styles.overlayTop,
          { paddingTop: 24 + (keyboardUp ? insets.top : 0), paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Full to empty</Text>
          <Text style={styles.hint}>
            Set how fast this need drops. Type either one and the other follows. Later check-ins can still adjust it.
          </Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={hoursText}
              onChangeText={onHoursChange}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.text.faint}
              selectTextOnFocus
              autoFocus
            />
            <Text
              style={styles.suffix}
              numberOfLines={1}
            >
              hours
            </Text>
          </View>
          <View style={styles.row}>
            <Text
              style={styles.prefix}
              numberOfLines={1}
            >
              1% per
            </Text>
            <TextInput
              style={styles.input}
              value={minutesText}
              onChangeText={onMinutesChange}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.text.faint}
              selectTextOnFocus
            />
            <Text
              style={styles.suffix}
              numberOfLines={1}
            >
              min
            </Text>
          </View>
          {valid ? (
            <Text
              style={styles.hint}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              = {formatEmptyHours(hours)} full to empty
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onPress={() => hours != null && onSubmit(hours)}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 17,
    fontWeight: '600',
  },
  prefix: { width: 64, color: Colors.text.muted, fontSize: 17, fontWeight: '600' },
  suffix: { width: 56, color: Colors.text.muted, fontSize: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
