import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EmojiKeyboard, type EmojisByCategory } from 'rn-emoji-keyboard';
import { Colors } from '../../utils/colors';
import { emojiData } from '../../utils/emoji-data';
import { emojiPickerTheme } from '../../utils/emoji-picker-theme';

interface Props {
  onPick: (emoji: string) => void;
  /** Limits the grid, e.g. to emoji that mix with the other slot. Defaults to every emoji. */
  categories?: EmojisByCategory[];
  selected?: string[];
}

/** The searchable emoji keyboard, drawn inline inside the icon picker sheet. */
export function EmojiGrid({ onPick, categories = emojiData, selected }: Props) {
  return (
    <View style={styles.wrap}>
      <EmojiKeyboard
        onEmojiSelected={emoji => onPick(emoji.emoji)}
        enableSearchBar
        hideHeader
        theme={emojiPickerTheme}
        styles={{ container: styles.container }}
        emojisByCategory={categories}
        selectedEmojis={selected ?? false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  container: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.bg.darker,
    shadowOpacity: 0,
    elevation: 0,
  },
});
