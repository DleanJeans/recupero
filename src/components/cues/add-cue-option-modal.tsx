import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useCustomCueOptions } from '../../hooks/use-custom-cue-options';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import { useCuesStore } from '../../store/cues-store';
import { Colors } from '../../utils/colors';
import {
  buildCustomCueOption,
  getBodySensationOptions,
  getMoodOptions,
  isCueOptionLabelTaken,
} from '../../utils/cue-utils';
import { findEmojiByKeyword } from '../../utils/emoji-data';
import { Button } from '../button';
import { EmojiPicker } from '../emoji-picker';
import { Text, TextInput } from '../text';

export type AddCueOptionKind = 'mood' | 'body';

const COPY: Record<AddCueOptionKind, { title: string; placeholder: string; fallbackEmoji: string }> = {
  mood: { title: 'New mood', placeholder: 'e.g. Anxious', fallbackEmoji: '🙂' },
  body: { title: 'New body sensation', placeholder: 'e.g. Cold', fallbackEmoji: '✋' },
};

interface AddCueOptionModalProps {
  /** Which list to add to; the modal is hidden while this is undefined. */
  kind?: AddCueOptionKind;
  onClose: () => void;
  /** Called with the new option's id after it is saved. */
  onAdded?: (kind: AddCueOptionKind, id: string) => void;
}

/** Small form for adding a mood or body sensation without leaving the current screen. */
export function AddCueOptionModal({ kind, onClose, onAdded }: AddCueOptionModalProps) {
  const keyboardUp = useKeyboardVisible();
  const custom = useCustomCueOptions();
  const addCustomMood = useCuesStore(state => state.addCustomMood);
  const addCustomSensation = useCuesStore(state => state.addCustomSensation);
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');

  const copy = COPY[kind ?? 'mood'];
  const existing = kind === 'body' ? getBodySensationOptions(custom.sensations) : getMoodOptions(custom.moods);
  const trimmed = label.trim();
  const taken = trimmed.length > 0 && isCueOptionLabelTaken(trimmed, existing);
  const canSave = trimmed.length > 0 && !taken;

  const close = () => {
    setLabel('');
    setEmoji('');
    onClose();
  };

  const save = () => {
    if (!kind || !canSave) return;
    const option = buildCustomCueOption(label, emoji, findEmojiByKeyword(trimmed) ?? copy.fallbackEmoji);
    const id = kind === 'mood' ? addCustomMood(option) : addCustomSensation(option);
    setLabel('');
    setEmoji('');
    onAdded?.(kind, id);
    onClose();
  };

  return (
    <Modal
      visible={kind != null}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.row}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
              nameHint={label}
              style={styles.emojiBox}
            />
            <TextInput
              style={styles.input}
              placeholder={copy.placeholder}
              placeholderTextColor={Colors.text.faint}
              value={label}
              onChangeText={setLabel}
              onSubmitEditing={save}
              returnKeyType="done"
              autoFocus
              maxLength={32}
            />
          </View>
          {taken ? <Text style={styles.error}>That one already exists.</Text> : null}
          <View style={styles.actions}>
            <Button
              variant="ghost"
              onPress={close}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={save}
              disabled={!canSave}
            >
              Add
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayTop: { justifyContent: 'flex-start' },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiBox: {
    width: 52,
    height: 46,
    borderRadius: 10,
  },
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
  error: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
