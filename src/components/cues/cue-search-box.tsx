import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { TextInput } from '../text';

interface CueSearchBoxProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}

export function CueSearchBox({ value, placeholder, onChangeText }: CueSearchBoxProps) {
  return (
    <View style={styles.search}>
      <Ionicons
        name="search"
        size={16}
        color={Colors.text.faint}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.faint}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: Colors.text.primary, fontSize: 14, paddingVertical: 10 },
});
