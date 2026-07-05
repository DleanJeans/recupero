import { Ionicons } from '@expo/vector-icons';
import React, { type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './text';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface CheckboxRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  style?: ViewStyle;
  /**
   * Collapsable content rendered below the toggle row within the same card.
   * Only valid with variant="card".
   */
  children?: ReactNode;
  /**
   * 'card' (default) renders a rounded card with the input background. When
   * `children` is provided, the card grows to wrap both the toggle row and the
   * children.
   * 'row' renders a borderless toggle row, intended for sub-toggles nested
   * inside a parent card.
   */
  variant?: 'card' | 'row';
}

export function CheckboxRow({ label, hint, checked, onToggle, style, children, variant = 'card' }: CheckboxRowProps) {
  const isRow = variant === 'row';
  const hasChildren = !isRow && children != null && children !== false;

  const icon = (
    <Ionicons
      name={(checked ? 'checkbox' : 'checkbox-outline') as IconName}
      size={22}
      color={checked ? Colors.text.primary : Colors.border.light}
    />
  );

  const labelStack = (
    <View style={styles.labelStack}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );

  if (isRow) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
        onPress={onToggle}
      >
        {icon}
        {labelStack}
      </Pressable>
    );
  }

  if (hasChildren) {
    return (
      <View style={[styles.card, style]}>
        <Pressable
          style={({ pressed }) => [styles.toggleInCard, pressed && styles.pressed]}
          onPress={onToggle}
        >
          {icon}
          {labelStack}
        </Pressable>
        <View style={styles.cardContent}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.cardSolo, pressed && styles.pressed, style]}
      onPress={onToggle}
    >
      {icon}
      {labelStack}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
  },
  cardSolo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  labelStack: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    color: Colors.border.light,
    fontSize: 12,
  },
});
