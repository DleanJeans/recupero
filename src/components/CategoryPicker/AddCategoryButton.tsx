import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AddCategoryButton({ isOpen, onPress, style }: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={onPress}
      style={[styles.button, style]}
      accessibilityLabel={isOpen ? 'Close form' : 'Add category'}
    >
      <Ionicons
        name={isOpen ? 'close-outline' : 'add-outline'}
        size={20}
        color={Colors.text.faint}
      />
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 0,
  },
});
