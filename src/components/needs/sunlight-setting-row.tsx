import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { Text } from '../text';

interface SunlightSettingRowProps {
  label: string;
  /** Short summary on the right of a row that opens. */
  value?: string;
  /** A control on the right that works in place (a switch, a stepper); the row doesn't open. */
  control?: ReactNode;
  /** What the row shows when opened. */
  children?: ReactNode;
  last?: boolean;
}

/** One line in the Sunlight sheet's Settings card: a label with its value, opening in place for the full control. */
export function SunlightSettingRow({ label, value, control, children, last }: SunlightSettingRowProps) {
  const [open, setOpen] = useState(false);
  const opens = children != null && control == null;

  return (
    <View style={[styles.container, !last && styles.divider]}>
      <Pressable
        style={({ pressed }) => [styles.row, opens && pressed && styles.pressed]}
        onPress={() => setOpen(current => !current)}
        disabled={!opens}
        accessibilityRole={opens ? 'button' : undefined}
        accessibilityState={opens ? { expanded: open } : undefined}
      >
        <Text style={styles.label}>{label}</Text>
        {control ?? (
          <View style={styles.valueBox}>
            {value != null && (
              <Text
                style={styles.value}
                numberOfLines={1}
              >
                {value}
              </Text>
            )}
            <Ionicons
              name={open ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={Colors.text.faint}
            />
          </View>
        )}
      </Pressable>
      {opens && open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 46,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  valueBox: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    flexShrink: 1,
    color: Colors.text.muted,
    fontSize: 12,
  },
  body: {
    gap: 8,
    paddingBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
