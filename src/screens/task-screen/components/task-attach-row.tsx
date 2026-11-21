import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

export interface AttachRowProps {
  icon: ReactNode;
  label: string;
  value: string | undefined;
  badge?: string;
  /** Greyed value ('None', 'Keep'). */
  dim?: boolean;
  /** Highlighted value ('Mixed'). */
  emphasis?: boolean;
  onPress: () => void;
  onClear?: () => void;
  last?: boolean;
}

export function AttachRow({ icon, label, value, badge, dim, emphasis, onPress, onClear, last }: AttachRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? 'none'}`}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <Text
        style={styles.rowLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.rowValue, (!value || dim) && styles.rowValueNone, emphasis && styles.rowValueMixed]}
        numberOfLines={1}
      >
        {value ?? 'None'}
      </Text>
      {badge ? (
        <Text
          style={styles.badge}
          numberOfLines={1}
        >
          {badge}
        </Text>
      ) : null}
      {onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label}`}
        >
          <Ionicons
            name="close"
            size={18}
            color={Colors.text.muted}
          />
        </Pressable>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.text.faint}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bg.card },
  rowIcon: { width: 26, alignItems: 'center' },
  rowLabel: { width: 68, color: Colors.text.muted, fontSize: 13 },
  rowValue: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  rowValueMixed: { color: '#F9A825' },
  rowValueNone: { color: Colors.text.faint },
  badge: {
    color: Colors.text.muted,
    backgroundColor: Colors.bg.card,
    fontSize: 11,
    fontWeight: '600',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
});
