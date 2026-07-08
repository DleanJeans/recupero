import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';

const DEFAULT_FONT_SIZE = 14;
const BOLD_WEIGHTS = ['700', '800', '900', 'bold'];

/**
 * Match emoji & symbol codepoints (incl. variation selectors and the ZWJ
 * used to compose multi-codepoint emoji like 🍄‍🟫). We use this to detect
 * emoji-only strings so we can route them to NotoColorEmoji — GoogleSans
 * lacks many recent emoji glyphs and breaks ZWJ sequences, which makes them
 * render as separate glyphs (e.g. the brown square leaking out of a
 * category chip as a wide tab).
 */
const EMOJI_CODEPOINT = /[\p{Extended_Pictographic}‍️]/u;

function isEmojiOnly(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  // Ignore whitespace so a stray newline doesn't disqualify an emoji string.
  const stripped = text.replace(/\s+/g, '');
  if (!stripped) return false;
  // Walk every grapheme cluster so ZWJ sequences count as one segment.
  for (const seg of stripped.matchAll(/\p{RI}\p{RI}|./gus)) {
    if (!EMOJI_CODEPOINT.test(seg[0])) return false;
  }
  return true;
}

function getFontFamily(flatStyle: TextStyle | undefined, children: React.ReactNode): string | undefined {
  if (flatStyle?.fontFamily) return flatStyle.fontFamily;
  if (isEmojiContent(children)) return 'NotoColorEmoji';
  const weight = String(flatStyle?.fontWeight ?? '');
  if (BOLD_WEIGHTS.includes(weight)) return 'GoogleSans-Bold';
  return 'GoogleSans';
}

function isEmojiContent(children: React.ReactNode): boolean {
  if (children == null || typeof children === 'boolean') return false;
  if (typeof children === 'string' || typeof children === 'number') {
    return isEmojiOnly(children);
  }
  if (Array.isArray(children)) {
    return children.every(isEmojiContent);
  }
  return false;
}

function defaultFont(flatStyle: TextStyle | undefined, children: React.ReactNode) {
  const fontSize = flatStyle?.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = getFontFamily(flatStyle, children);
  return {
    fontFamily,
    fontSize,
    fontWeight: undefined,
    includeFontPadding: false,
  };
}

function Text(props: TextProps) {
  const flatStyle = StyleSheet.flatten(props.style) as TextStyle | undefined;

  return (
    <RNText
      {...props}
      style={[props.style, defaultFont(flatStyle, props.children)]}
    />
  );
}

const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const flatStyle = StyleSheet.flatten(props.style) as TextStyle | undefined;

  return (
    <RNTextInput
      {...props}
      ref={ref}
      style={[props.style, defaultFont(flatStyle, props.children)]}
    />
  );
});

export { Text, TextInput };
