import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';
import { AppIcon } from '../../app-icon';
import { Text } from '../../text';

interface CheckInSquareProps {
  tag: 'MOOD' | 'BODY';
  /** Emoji of the latest log, or undefined when nothing was logged yet. */
  emoji?: string;
  title: string;
  /** "3 h ago" or a hint when stale. */
  caption: string;
  stale: boolean;
  /** Just logged: shows the XP chip. */
  gain?: number;
  onPress: () => void;
}

/** Current mood or body state as a tappable square; amber and dashed when it is stale. */
export function CheckInSquare({ tag, emoji, title, caption, stale, gain, onPress }: CheckInSquareProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.square, stale && styles.stale, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tag === 'MOOD' ? 'Mood' : 'Body'}: ${title}, ${caption}. Tap to log`}
    >
      <Text style={styles.tag}>{tag}</Text>
      <AppIcon
        value={emoji ?? ''}
        fallback="＋"
        size={30}
      />
      <View style={styles.copy}>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[styles.caption, stale && styles.staleCaption]}
          numberOfLines={1}
        >
          {caption}
        </Text>
      </View>
      {stale ? (
        <View style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </View>
      ) : null}
      {gain != null && gain > 0 ? (
        <View style={styles.gain}>
          <Text style={styles.gainText}>+{gain} XP</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  square: {
    flex: 1,
    minHeight: 96,
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 11,
  },
  stale: { backgroundColor: '#221d12', borderColor: `${Colors.cooldown.yellow}88`, borderStyle: 'dashed' },
  pressed: { opacity: 0.72 },
  tag: {
    position: 'absolute',
    top: 9,
    right: 11,
    color: Colors.text.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  copy: { gap: 1 },
  title: { color: Colors.text.primary, fontSize: 13, fontWeight: '700' },
  caption: { color: Colors.text.muted, fontSize: 11 },
  staleCaption: { color: Colors.cooldown.yellow },
  plus: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cooldown.yellow,
  },
  plusText: { color: Colors.bg.black, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  gain: {
    position: 'absolute',
    top: -9,
    right: 10,
    backgroundColor: Colors.cooldown.yellow,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  gainText: { color: Colors.bg.black, fontSize: 10, fontWeight: '800' },
});
