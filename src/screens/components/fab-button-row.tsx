import React from 'react';
import { StyleSheet, View } from 'react-native';
import { buttonStyles } from '../../components/button';

interface FabButtonRowProps {
  children: React.ReactNode;
}

export function FabButtonRow({ children }: FabButtonRowProps) {
  return <View style={[buttonStyles.fab, styles.row]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 0,
    flexDirection: 'row',
    gap: 12,
    bottom: 16,
  },
});
