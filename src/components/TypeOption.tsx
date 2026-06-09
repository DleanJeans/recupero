import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface TypeOptionProps {
  label: string;
  active: boolean;
  activeBtnStyle?: ViewStyle;
  activeTextStyle?: object;
  onPress: () => void;
  style?: ViewStyle;
}
export function TypeOption({ label, active, activeBtnStyle, activeTextStyle, onPress, style }: TypeOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, style, active && activeBtnStyle, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Text style={[styles.text, active && activeTextStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '500',
  },
});
