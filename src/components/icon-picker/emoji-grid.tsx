import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EmojiKeyboard, type EmojisByCategory } from 'rn-emoji-keyboard';
import { Colors } from '../../utils/colors';
import { emojiData, findEmojisForWords } from '../../utils/emoji-data';
import { emojiPickerTheme } from '../../utils/emoji-picker-theme';
import { searchEmojiCategories } from '../../utils/emoji-search-utils';
import { Text, TextInput } from '../text';

interface Props {
  onPick: (emoji: string) => void;
  /** Limits the grid, e.g. to emoji that mix with the other slot. Defaults to every emoji. */
  categories?: EmojisByCategory[];
  selected?: string[];
  /** Shown when the search matches nothing in `categories`. */
  emptyLabel?: string;
  /** Name of the thing being iconised; each of its words gets its own suggested emoji above the grid. */
  nameHint?: string;
}

/** The searchable emoji keyboard, drawn inline inside the icon picker sheet. Search takes words or an actual emoji. */
export function EmojiGrid({
  onPick,
  categories = emojiData,
  selected,
  emptyLabel = 'No emoji found',
  nameHint,
}: Props) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchEmojiCategories(categories, query), [categories, query]);
  const suggestions = useMemo(() => (nameHint ? findEmojisForWords(nameHint) : []), [nameHint]);
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
      {suggestions.length > 0 && !searching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}
          keyboardShouldPersistTaps="handled"
        >
          {suggestions.map(({ word, emoji }) => (
            <Pressable
              key={emoji}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              onPress={() => onPick(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${emoji} for ${word}`}
            >
              <Text style={styles.suggestionEmoji}>{emoji}</Text>
              <Text
                style={styles.suggestionWord}
                numberOfLines={1}
              >
                {word}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {shown.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
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
      )}
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
  suggestions: { flexGrow: 0, marginBottom: 6 },
  suggestionsContent: { gap: 8 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg.input,
  },
  suggestionEmoji: { fontSize: 20 },
  suggestionWord: { color: Colors.text.primary, fontSize: 13, flexShrink: 0 },
  pressed: { opacity: 0.7 },
  empty: { color: Colors.text.muted, fontSize: 14, textAlign: 'center', padding: 24 },
  container: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.bg.darker,
    shadowOpacity: 0,
    elevation: 0,
  },
});
