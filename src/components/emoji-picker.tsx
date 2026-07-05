import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { EmojiType } from 'rn-emoji-keyboard';
import EmojiKeyboard from 'rn-emoji-keyboard';
import { Colors } from '../utils/colors';
import { emojiData, findEmojiByKeyword } from '../utils/emoji-data';
import { Text } from './text';

const pickerTheme = {
  backdrop: 'transparent',
  knob: Colors.border.dim,
  container: Colors.bg.card,
  header: Colors.text.primary,
  skinTonesContainer: Colors.bg.input,
  category: {
    icon: Colors.text.muted,
    iconActive: Colors.text.primary,
    container: Colors.bg.input,
    containerActive: Colors.border.dim,
  },
  search: {
    text: Colors.text.primary,
    placeholder: Colors.text.faint + '88',
    icon: Colors.text.muted,
    background: Colors.bg.input,
  },
  emoji: {
    selected: Colors.border.default,
  },
};

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  /** Current name input value, used to suggest a matching emoji as placeholder. */
  nameHint?: string;
  /** Called after an emoji is selected (e.g. to focus the next input). */
  onPick?: () => void;
  /** Called when the emoji keyboard opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

export function EmojiPicker({ value, onChangeText, nameHint, onPick, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);

  const suggestedEmoji = useMemo(() => {
    if (value || !nameHint?.trim()) return null;
    return findEmojiByKeyword(nameHint);
  }, [nameHint, value]);

  const handlePress = () => {
    if (!value && suggestedEmoji) {
      onChangeText(suggestedEmoji);
      onPick?.();
    }
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const handlePick = (emojiObject: EmojiType) => {
    onChangeText(emojiObject.emoji);
    handleClose();
    onPick?.();
  };

  return (
    <>
      <Pressable
        style={styles.input}
        onPress={handlePress}
      >
        {value ? (
          <Text style={styles.emoji}>{value}</Text>
        ) : suggestedEmoji ? (
          <Text style={styles.emojiPlaceholder}>{suggestedEmoji}</Text>
        ) : (
          <Ionicons
            name="happy-outline"
            size={20}
            color={Colors.border.dark}
          />
        )}
      </Pressable>
      {open && (
        <EmojiKeyboard
          open={open}
          onEmojiSelected={handlePick}
          onClose={handleClose}
          enableSearchBar
          theme={pickerTheme}
          emojisByCategory={emojiData}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    width: 48,
    height: 40,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    color: Colors.text.primary,
    fontSize: 20,
  },
  emojiPlaceholder: {
    color: Colors.text.primary,
    fontSize: 20,
    opacity: 0.3,
  },
});
