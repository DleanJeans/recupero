import React from 'react';
import { type GestureResponderEvent, Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: Variant;
  size?: Size;
  fab?: boolean;
  active?: boolean;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const PRESSED_OPACITY: Record<Variant, number> = {
  primary: 0.85,
  secondary: 0.6,
  danger: 0.8,
  ghost: 0.7,
  icon: 0.5,
};

const SCALE = { primary: 0.98, secondary: 0.98 } as const;

function pressedStyle(variant: Variant) {
  const opacity = PRESSED_OPACITY[variant];
  const scale = SCALE[variant as keyof typeof SCALE];
  if (!scale) return { opacity };
  return { opacity, transform: [{ scale }] as const };
}

export function Button({
  variant = 'secondary',
  size = 'md',
  fab,
  active,
  children,
  overlay,
  style,
  onPress,
  onLongPress,
  disabled,
  accessibilityLabel,
}: Props) {
  const isText = typeof children === 'string';
  return (
    <Pressable
      style={({ pressed }) => [
        commonStyles.base,
        baseStyles[variant],
        variant !== 'icon' && !fab && sizeStyles[size],
        fab && buttonStyles.fab,
        active && activeStyles[variant],
        pressed && pressedStyle(variant),
        disabled && { opacity: 0.4 },
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      {isText ? (
        <Text style={[commonTextStyles.base, textStyles[variant], active && textActiveStyles[variant]]}>
          {children}
        </Text>
      ) : (
        children
      )}
      {overlay}
    </Pressable>
  );
}

const commonStyles = StyleSheet.create({
  base: { borderRadius: 8, alignItems: 'center', position: 'relative' },
});

const baseStyles = StyleSheet.create({
  primary: { backgroundColor: Colors.text.primary },
  secondary: { backgroundColor: Colors.bg.input },
  danger: { backgroundColor: Colors.status.danger },
  ghost: { backgroundColor: Colors.bg.card },
  icon: { justifyContent: 'center' },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingHorizontal: 10, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 14 },
  lg: { flex: 1, paddingVertical: 14 },
});

const activeStyles = StyleSheet.create({
  primary: {},
  secondary: { backgroundColor: Colors.border.default },
  danger: {},
  ghost: { backgroundColor: Colors.border.default },
  icon: {},
});

const commonTextStyles = StyleSheet.create({
  base: { fontWeight: '600' as const },
});

const textStyles = StyleSheet.create({
  primary: { color: Colors.bg.black, fontSize: 16 },
  secondary: { color: Colors.text.light, fontSize: 16 },
  danger: { color: Colors.text.primary, fontSize: 13 },
  ghost: { color: Colors.text.faint, fontSize: 13 },
  icon: { color: Colors.text.primary, fontSize: 16 },
});

const textActiveStyles = StyleSheet.create({
  primary: {},
  secondary: {},
  danger: {},
  ghost: { color: Colors.text.primary },
  icon: {},
});

export const buttonStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flex: 0,
    borderRadius: 12,
    paddingVertical: 14,
  },
});
