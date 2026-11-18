import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';

interface NeedAmountDialogProps {
  title: string;
  hint?: string;
  /** Prefilled value. */
  initial?: number;
  /** Lowest and highest accepted value. */
  min: number;
  max: number;
  /** Shown after the number, e.g. "%". */
  suffix?: string;
  onSubmit: (value: number) => void;
  onClose: () => void;
}

/** Small dialog to type one number for a need, e.g. a custom check-in level or top-up. */
export function NeedAmountDialog({
  title,
  hint,
  initial,
  min,
  max,
  suffix = '%',
  onSubmit,
  onClose,
}: NeedAmountDialogProps) {
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initial != null ? String(Math.round(initial)) : '');
  const value = parseDecimalInput(text);
  const valid = value != null && value >= min && value <= max;

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
          <Text style={styles.title}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              placeholder={`${min}-${max}`}
              placeholderTextColor={Colors.text.faint}
              selectTextOnFocus
              autoFocus
            />
            <Text style={styles.suffix}>{suffix}</Text>
          </View>
          <View style={styles.actions}>
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onPress={() => value != null && onSubmit(value)}
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  suffix: { color: Colors.text.muted, fontSize: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
