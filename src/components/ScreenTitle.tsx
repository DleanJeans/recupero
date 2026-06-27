import React from 'react';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import { type StyleProp, StyleSheet, type TextStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface ScreenTitleProps {
  children: React.ReactNode;
  large?: boolean;
  style?: StyleProp<TextStyle>;
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
}

export function ScreenTitle({ children, style, onTextLayout }: ScreenTitleProps) {
  return (
    <Text
      style={[styles.title, style]}
      onTextLayout={onTextLayout}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
});
