import React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface ScreenTitleProps {
  children: React.ReactNode;
  large?: boolean;
  style?: TextStyle;
}

export function ScreenTitle({ children, style }: ScreenTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
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
