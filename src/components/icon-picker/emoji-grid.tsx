import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmojiKeyboard, type EmojisByCategory } from 'rn-emoji-keyboard';
import { Colors } from '../../utils/colors';
import { emojiData } from '../../utils/emoji-data';
import { emojiPickerTheme } from '../../utils/emoji-picker-theme';
import { searchEmojiCategories } from '../../utils/emoji-search-utils';
import { TextInput } from '../text';

interface Props {
  onPick: (emoji: string) => void;
  /** Limits the grid, e.g. to emoji that mix with the other slot. Defaults to every emoji. */
  categories?: EmojisByCategory[];
  selected?: string[];
}

/** The searchable emoji keyboard, drawn inline inside the icon picker sheet. Search takes words or an actual emoji. */
export function EmojiGrid({ onPick, categories = emojiData, selected }: Props) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchEmojiCategories(categories, query), [categories, query]);
  const searching = query.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or paste an emoji"
        placeholderTextColor={`${Colors.text.faint}88`}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Search emoji"
      />
      <EmojiKeyboard
        // The keyboard keeps its category list in state, so remount when the results change.
        key={searching ? `q:${query}` : 'all'}
        onEmojiSelected={emoji => onPick(emoji.emoji)}
        hideHeader
        theme={emojiPickerTheme}
        styles={{ container: styles.container }}
        emojisByCategory={shown}
        selectedEmojis={selected ?? false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  search: {
    height: 40,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    fontSize: 15,
  },
  container: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.bg.darker,
    shadowOpacity: 0,
    elevation: 0,
  },
});
