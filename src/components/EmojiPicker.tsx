import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { EmojiType } from 'rn-emoji-keyboard';
import EmojiKeyboard from 'rn-emoji-keyboard';
import { emojiData, findEmojiByKeyword } from '../utils/emojiData';
import { Text } from './Text';

const pickerTheme = {
  backdrop: 'transparent',
  knob: '#555',
  container: '#1e1e1e',
  header: '#fff',
  skinTonesContainer: '#2a2a2a',
  category: {
    icon: '#888',
    iconActive: '#fff',
    container: '#2a2a2a',
    containerActive: '#444',
  },
  search: {
    text: '#fff',
    placeholder: '#66666688',
    icon: '#888',
    background: '#2a2a2a',
  },
  emoji: {
    selected: '#333',
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
            color="#4a4a4a"
          />
        )}
      </Pressable>
      <EmojiKeyboard
        open={open}
        onEmojiSelected={handlePick}
        onClose={handleClose}
        enableSearchBar
        theme={pickerTheme}
        emojisByCategory={emojiData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    width: 48,
    height: 40,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    color: '#fff',
    fontSize: 20,
  },
  emojiPlaceholder: {
    color: '#fff',
    fontSize: 20,
    opacity: 0.3,
  },
});
