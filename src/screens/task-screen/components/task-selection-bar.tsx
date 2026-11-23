import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetOption } from '../../../components/behavior-action-sheet';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { TaskList } from '../../../types/task';
import { Colors } from '../../../utils/colors';

const MOVE_TARGETS: { list: TaskList; label: string; icon: 'list-outline' | 'cart-outline' | 'moon-outline' }[] = [
  { list: 'next', label: 'Move to Today', icon: 'list-outline' },
  { list: 'shopping', label: 'Move to Shopping', icon: 'cart-outline' },
  { list: 'someday', label: 'Move to Later', icon: 'moon-outline' },
];

interface TaskSelectionBarProps {
  count: number;
  onCancel: () => void;
  onEdit: () => void;
  onMove: (list: TaskList) => void;
}

/** Bottom bar of select mode on Tasks: how many are picked, Move and Edit. */
export function TaskSelectionBar({ count, onCancel, onEdit, onMove }: TaskSelectionBarProps) {
  const insets = useSafeAreaInsets();
  const [moveOpen, setMoveOpen] = useState(false);

  return (
    <>
      {/* The bottom nav sits below this screen and already pads for the system inset. */}
      <View style={styles.bar}>
        <Button
          variant="ghost"
          size="sm"
          onPress={onCancel}
          accessibilityLabel="Cancel selection"
        >
          Cancel
        </Button>
        <Text
          style={styles.count}
          numberOfLines={1}
        >
          {`${count} selected`}
        </Text>
        <Button
          size="sm"
          disabled={count === 0}
          onPress={() => setMoveOpen(true)}
        >
          Move
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={count === 0}
          onPress={onEdit}
        >
          {`Edit ${count}`}
        </Button>
      </View>
      {moveOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setMoveOpen(false)}
        >
          <View style={styles.overlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setMoveOpen(false)}
              accessibilityLabel="Close menu"
            />
            <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
              <View style={styles.grabber} />
              {MOVE_TARGETS.map(target => (
                <SheetOption
                  key={target.list}
                  icon={target.icon}
                  label={target.label}
                  onPress={() => {
                    setMoveOpen(false);
                    onMove(target.list);
                  }}
                />
              ))}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  count: { flex: 1, color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.dim,
    marginBottom: 14,
  },
});
