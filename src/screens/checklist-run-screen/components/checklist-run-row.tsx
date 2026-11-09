import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text } from '../../../components/text';
import type { BehaviorEntry } from '../../../types/behavior';
import type { ChecklistTick } from '../../../types/checklist';
import { Colors } from '../../../utils/colors';
import { formatTime } from '../../../utils/time-utils';

interface ChecklistRunRowProps {
  label: string;
  behavior?: BehaviorEntry;
  tick?: ChecklistTick;
  /** Tap the box: log now (or untick). */
  onToggle: () => void;
  /** Tap the row: open the log form for a behaviour, or tick a plain item. */
  onPress: () => void;
  /** Long-press the row: skip (or unskip). */
  onLongPress: () => void;
}

/** One item while running a checklist: checkbox, icon, name and when it was ticked. */
export function ChecklistRunRow({ label, behavior, tick, onToggle, onPress, onLongPress }: ChecklistRunRowProps) {
  const done = tick != null && !tick.skipped;
  const skipped = tick?.skipped === true;
  const subtitle = done
    ? `${behavior ? 'Logged' : 'Ticked'} ${formatTime(tick.at)}`
    : skipped
      ? 'Skipped · long-press to undo'
      : behavior
        ? 'Tap the box to log now, the row to adjust'
        : undefined;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, !tick && styles.openRow, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      accessibilityHint={behavior ? 'Opens the log form. Long-press to skip.' : 'Long-press to skip.'}
    >
      <Pressable
        style={[styles.box, done && styles.boxDone, skipped && styles.boxSkipped]}
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityLabel={done ? `Untick ${label}` : `Tick ${label}`}
        accessibilityState={{ checked: done }}
      >
        {done && (
          <Ionicons
            name="checkmark"
            size={18}
            color={Colors.bg.black}
          />
        )}
        {skipped && (
          <Ionicons
            name="remove"
            size={16}
            color={Colors.text.faint}
          />
        )}
      </Pressable>
      <View style={[styles.icon, tick && styles.faded]}>
        {behavior ? (
          <BehaviorIcon
            behavior={behavior}
            size={28}
          />
        ) : (
          <View style={styles.plainDot} />
        )}
      </View>
      <View style={styles.text}>
        <Text
          style={[styles.label, tick && styles.labelDone]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {behavior && !tick ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors.text.faint}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: Colors.bg.card,
  },
  openRow: {
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pressed: {
    opacity: 0.7,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: {
    backgroundColor: Colors.type.desirable,
    borderColor: Colors.type.desirable,
  },
  boxSkipped: {
    borderColor: Colors.border.dim,
  },
  icon: {
    width: 30,
    alignItems: 'center',
  },
  faded: {
    opacity: 0.5,
  },
  plainDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  labelDone: {
    color: Colors.text.muted,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
