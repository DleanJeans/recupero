import React from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: Variant;
  size?: Size;
  active?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const PRESSED_OPACITY: Record<Variant, number> = { primary: 0.85, secondary: 0.6, danger: 0.8, ghost: 0.7, icon: 0.5 };

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
  active,
  children,
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
        baseStyles[variant],
        variant !== 'icon' && sizeStyles[size],
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
      {isText ? <Text style={[textStyles[variant], active && textActiveStyles[variant]]}>{children}</Text> : children}
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  primary: { backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  secondary: { backgroundColor: '#2a2a2a', borderRadius: 12, alignItems: 'center' },
  danger: { backgroundColor: '#943030', borderRadius: 12, alignItems: 'center' },
  ghost: { backgroundColor: '#1e1e1e', borderRadius: 8, alignItems: 'center' },
  icon: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingHorizontal: 10, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 14 },
  lg: { flex: 1, paddingVertical: 14 },
});

const activeStyles = StyleSheet.create({
  primary: {},
  secondary: { backgroundColor: '#333' },
  danger: {},
  ghost: { backgroundColor: '#333' },
  icon: {},
});

const textStyles = StyleSheet.create({
  primary: { color: '#000', fontSize: 16, fontWeight: '600' },
  secondary: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  danger: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ghost: { color: '#666', fontSize: 13, fontWeight: '600' },
  icon: { color: '#fff', fontSize: 16 },
});

const textActiveStyles = StyleSheet.create({
  primary: {},
  secondary: {},
  danger: {},
  ghost: { color: '#fff' },
  icon: {},
});
