import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface CueSectionProps {
  title: string;
  children: React.ReactNode;
}

export function CueSection({ title, children }: CueSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 14,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
