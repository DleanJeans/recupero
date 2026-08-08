import React from 'react';
import { Pressable, type StyleProp, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './text';

interface SelectPillProps {
  label: string;
  active: boolean;
  activeBtnStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}
export function SelectPill({
  label,
  active,
  activeBtnStyle,
  textStyle,
  activeTextStyle,
  onPress,
  style,
}: SelectPillProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, style, active && activeBtnStyle, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, textStyle, active && activeTextStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '500',
  },
});
