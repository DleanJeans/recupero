import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { findEmojiByKeyword } from '../utils/emoji-data';
import { AppIcon } from './app-icon';
import { IconPickerSheet } from './icon-picker/icon-picker-sheet';
import { Text } from './text';

interface Props {
  /** Stored icon: plain emoji, Emoji Kitchen mix, stacked emoji or image link (see icon-utils). */
  value: string;
  onChangeText: (v: string) => void;
  /** Current name input value, used to suggest a matching emoji as placeholder. */
  nameHint?: string;
  /** Called after an icon is picked (e.g. to focus the next input). */
  onPick?: () => void;
  /** Called when the picker opens or closes. */
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

/** Icon field used by every form. Opens the Emoji / Mix / Image picker sheet. */
export function EmojiPicker({ value, onChangeText, nameHint, onPick, onOpenChange, style }: Props) {
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

  const handleChange = (next: string) => {
    onChangeText(next);
    onPick?.();
  };

  return (
    <>
      <Pressable
        style={[styles.input, style]}
        onPress={handlePress}
        accessibilityLabel="Choose icon"
      >
        {value ? (
          <AppIcon
            value={value}
            style={styles.emoji}
          />
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
        <IconPickerSheet
          value={value || suggestedEmoji || ''}
          onChange={handleChange}
          onClose={handleClose}
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
