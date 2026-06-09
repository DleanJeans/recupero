import React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { Text } from './Text';

interface ScreenTitleProps {
  children: string;
  large?: boolean;
  style?: TextStyle;
}

export function ScreenTitle({ children, style }: ScreenTitleProps) {
  return (
    <Text style={[styles.title, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
});
