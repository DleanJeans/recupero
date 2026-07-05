import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface HomeSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}
export function HomeSearchBar({ value, onChangeText, onClose }: HomeSearchBarProps) {
  return (
    <View style={styles.searchBar}>
      <Ionicons
        name="search"
        size={18}
        color={Colors.text.muted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search behaviors..."
        placeholderTextColor={Colors.text.faint}
        autoFocus
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Button
          variant="icon"
          onPress={onClose}
          accessibilityLabel="Clear search"
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={Colors.text.muted}
          />
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0,
  },
});
