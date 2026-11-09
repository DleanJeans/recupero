import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

export const CHECKLIST_ROW_HEIGHT = 56;
export const CHECKLIST_ROW_GAP = 6;
const SLOT = CHECKLIST_ROW_HEIGHT + CHECKLIST_ROW_GAP;

interface ChecklistItemRowProps {
  index: number;
  count: number;
  /** Behaviour for a behaviour item; undefined for a plain item (or a behaviour that was deleted). */
  behavior?: BehaviorEntry;
  label: string;
  subtitle: string;
  /** -1 / 0 / 1: slot offset while another row is dragged past this one. */
  shift: number;
  /** True while any row is being dragged. When it ends, rows snap to place since the list has been reordered. */
  dragActive: boolean;
  dragging: boolean;
  onDragStart: (index: number) => void;
  onDragMove: (to: number) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}

/** A checklist item in the editor. Drag the handle to reorder; other rows slide out of the way. */
export function ChecklistItemRow({
  index,
  count,
  behavior,
  label,
  subtitle,
  shift,
  dragActive,
  dragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemove,
}: ChecklistItemRowProps) {
  const dragY = useRef(new Animated.Value(0)).current;
  const shiftY = useRef(new Animated.Value(0)).current;
  const latest = useRef({ index, count, onDragStart, onDragMove, onDragEnd });
  latest.current = { index, count, onDragStart, onDragMove, onDragEnd };
  const lastTarget = useRef(index);

  useEffect(() => {
    if (dragActive) Animated.timing(shiftY, { toValue: shift * SLOT, duration: 140, useNativeDriver: true }).start();
    else shiftY.setValue(shift * SLOT);
  }, [dragActive, shift, shiftY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        lastTarget.current = latest.current.index;
        dragY.setValue(0);
        latest.current.onDragStart(latest.current.index);
      },
      onPanResponderMove: (_event, gesture) => {
        dragY.setValue(gesture.dy);
        const { index: from, count: total } = latest.current;
        const target = Math.max(0, Math.min(total - 1, from + Math.round(gesture.dy / SLOT)));
        if (target !== lastTarget.current) {
          lastTarget.current = target;
          latest.current.onDragMove(target);
        }
      },
      onPanResponderRelease: () => {
        dragY.setValue(0);
        shiftY.setValue(0);
        latest.current.onDragEnd();
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        shiftY.setValue(0);
        latest.current.onDragEnd();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.row, dragging && styles.draggingRow, { transform: [{ translateY: dragging ? dragY : shiftY }] }]}
    >
      <View
        style={styles.handle}
        accessibilityLabel={`Reorder ${label}`}
        accessibilityHint="Drag up or down"
        {...panResponder.panHandlers}
      >
        <Ionicons
          name="reorder-three"
          size={22}
          color={Colors.text.faint}
        />
      </View>
      <View style={styles.icon}>
        {behavior ? (
          <BehaviorIcon
            behavior={behavior}
            size={26}
          />
        ) : (
          <View style={styles.plainDot} />
        )}
      </View>
      <View style={styles.text}>
        <Text
          style={styles.label}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Button
        variant="icon"
        onPress={onRemove}
        accessibilityLabel={`Remove ${label}`}
      >
        <Ionicons
          name="close"
          size={18}
          color={Colors.text.faint}
        />
      </Button>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: CHECKLIST_ROW_HEIGHT,
    marginBottom: CHECKLIST_ROW_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
    borderRadius: 12,
    backgroundColor: Colors.bg.card,
  },
  draggingRow: {
    zIndex: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.elevated,
  },
  handle: {
    height: '100%',
    paddingLeft: 12,
    paddingRight: 4,
    justifyContent: 'center',
  },
  icon: {
    width: 28,
    alignItems: 'center',
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
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
