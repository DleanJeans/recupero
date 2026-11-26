import React from 'react';
import { StyleSheet } from 'react-native';
import { Colors } from '../../utils/colors';
import { Text } from '../text';

interface CueSectionLabelProps {
  children: React.ReactNode;
  numberOfLines?: number;
}

export function CueSectionLabel({ children, numberOfLines }: CueSectionLabelProps) {
  return (
    <Text
      style={styles.label}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
});
