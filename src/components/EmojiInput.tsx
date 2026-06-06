import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './Text';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next';
  autoFocus?: boolean;
}

export function EmojiInput({ value, onChangeText, onSubmitEditing, returnKeyType, autoFocus }: Props) {
  const inputRef = useRef<import('react-native').TextInput>(null);

  return (
    <Pressable
      style={styles.input}
      onPress={() => inputRef.current?.focus()}
    >
      {value ? (
        <Text style={styles.emoji}>{value}</Text>
      ) : (
        <Ionicons
          name="happy-outline"
          size={20}
          color="#4a4a4a"
        />
      )}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoFocus={autoFocus}
        maxLength={2}
      />
    </Pressable>
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
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
});
