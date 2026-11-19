import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { EmojiPicker } from '../../../components/emoji-picker';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { useNeedsStore } from '../../../store/needs-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { findEmojiByKeyword } from '../../../utils/emoji-data';
import { toPlainEmoji } from '../../../utils/icon-utils';
import { parseDecimalInput } from '../../../utils/metadata-calculation-utils';
import { CUSTOM_NEED_COLORS, formatEmptyHours, NEED_INFO } from '../../../utils/need-utils';

const DEFAULT_HOURS = 24;

interface CustomNeedModalProps {
  visible: boolean;
  /** Set to edit that custom need; undefined makes a new one. */
  needId?: NeedId;
  onClose: () => void;
  /** Called with the id of a newly made need, e.g. to pick what fills it. */
  onAdded?: (id: NeedId) => void;
}

/** Make, edit or delete a need of your own. It behaves like the built-in ones. */
export function CustomNeedModal({ visible, needId, onClose, onAdded }: CustomNeedModalProps) {
  const keyboardUp = useKeyboardVisible();
  const addCustomNeed = useNeedsStore(state => state.addCustomNeed);
  const updateCustomNeed = useNeedsStore(state => state.updateCustomNeed);
  const removeCustomNeed = useNeedsStore(state => state.removeCustomNeed);
  const existing = useNeedsStore(state => state.customNeeds.find(def => def.id === needId));
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [hours, setHours] = useState(String(DEFAULT_HOURS));
  const [color, setColor] = useState(CUSTOM_NEED_COLORS[0]);

  useEffect(() => {
    if (!visible) return;
    setLabel(existing?.label ?? '');
    setEmoji(existing?.emoji ?? '');
    setHours(String(existing?.emptyHours ?? DEFAULT_HOURS));
    setColor(existing?.color ?? CUSTOM_NEED_COLORS[0]);
  }, [visible, existing]);

  const trimmed = label.trim();
  const parsedHours = parseDecimalInput(hours);
  const validHours = parsedHours != null && parsedHours >= 0.5 && parsedHours <= 24 * 60;
  const taken =
    trimmed.length > 0 &&
    Object.values(NEED_INFO).some(info => info.id !== needId && info.label.toLowerCase() === trimmed.toLowerCase());
  const canSave = trimmed.length > 0 && !taken && validHours;

  const save = () => {
    if (!canSave || parsedHours == null) return;
    const icon = toPlainEmoji(emoji) || findEmojiByKeyword(trimmed) || '⭐';
    const input = { emoji: icon, label: trimmed, emptyHours: parsedHours, color };
    if (existing) updateCustomNeed(existing.id, input);
    else onAdded?.(addCustomNeed(input));
    onClose();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(`Delete ${existing.label}?`, 'Its bar and check-ins go away. Your logs and behaviours stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeCustomNeed(existing.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{existing ? 'Edit need' : 'New need'}</Text>
          <View style={styles.row}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
              nameHint={label}
              style={styles.emojiBox}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Reading, Pet care, Quiet time"
              placeholderTextColor={Colors.text.faint}
              value={label}
              onChangeText={setLabel}
              returnKeyType="done"
              autoFocus={!existing}
              maxLength={24}
            />
          </View>
          {taken ? <Text style={styles.error}>A need with that name already exists.</Text> : null}
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Full to empty in</Text>
            <TextInput
              style={[styles.input, styles.hours]}
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <Text style={styles.fieldLabel}>hours</Text>
          </View>
          <Text style={styles.hint}>
            {validHours && parsedHours != null
              ? `About ${formatEmptyHours(parsedHours)}. Your check-ins adjust this over time.`
              : 'Between 0.5 and 1440 hours.'}
          </Text>
          <View style={styles.colors}>
            {CUSTOM_NEED_COLORS.map(value => (
              <Pressable
                key={value}
                onPress={() => setColor(value)}
                style={[styles.swatch, { backgroundColor: value }, color === value && styles.swatchOn]}
                accessibilityRole="button"
                accessibilityLabel={`Chart colour ${value}`}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            After adding, pick which behaviours fill it, or a metadata field such as minutes or kcal.
          </Text>
          <View style={styles.actions}>
            {existing ? (
              <Button
                variant="ghost"
                onPress={confirmDelete}
              >
                Delete
              </Button>
            ) : null}
            <View style={styles.spacer} />
            <Button
              variant="ghost"
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={save}
              disabled={!canSave}
            >
              {existing ? 'Save' : 'Add'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayTop: { justifyContent: 'flex-start' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 12 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiBox: { width: 52, height: 46, borderRadius: 10 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
  },
  hours: { flex: 0, width: 80, textAlign: 'center' },
  fieldLabel: { color: Colors.text.secondary, fontSize: 14 },
  hint: { color: Colors.text.faint, fontSize: 12 },
  error: { color: Colors.text.muted, fontSize: 12 },
  colors: { flexDirection: 'row', gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: Colors.text.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
});
