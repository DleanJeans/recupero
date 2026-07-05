import React from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { Colors } from '../../utils/colors';
import { Button } from '../button';
import { Text } from '../text';

interface CategoryBarChipProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  count?: number;
  showLabel?: boolean;
  active?: boolean;
  bar?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function CategoryBarChip({
  children,
  icon,
  label,
  count,
  showLabel = true,
  active,
  bar = true,
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
}: CategoryBarChipProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      active={active}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[bar ? styles.barChip : styles.chip, style]}
      accessibilityLabel={accessibilityLabel}
    >
      {children ?? (
        <>
          {renderIcon(icon, active)}
          {showLabel && label && <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>}
          {bar && count != null && (
            <Text style={[styles.chipCount, active && styles.chipCountActive, showLabel && { marginTop: 1.5 }]}>
              {count}
            </Text>
          )}
        </>
      )}
    </Button>
  );
}

function renderIcon(icon: React.ReactNode, active?: boolean) {
  if (typeof icon === 'string') {
    return <Text style={[styles.chipEmoji, !active && styles.chipEmojiInactive]}>{icon}</Text>;
  }
  return icon;
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  barChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  chipEmoji: { fontSize: 13 },
  chipEmojiInactive: { opacity: 0.4 },
  chipText: { color: Colors.text.faint, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: Colors.text.primary },
  chipCount: { color: Colors.text.dim, fontSize: 11, fontWeight: '500', marginLeft: 2 },
  chipCountActive: { color: Colors.text.muted },
});
