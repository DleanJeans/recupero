import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetOption } from '../../../components/behavior-action-sheet';
import { Text } from '../../../components/text';
import type { TaskEntry, TaskList } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { TODAY_FOCUS_LIMIT } from '../../../utils/task-utils';

const MOVE_OPTIONS: Record<
  TaskList,
  { label: string; hint: string; icon: 'list-outline' | 'cart-outline' | 'moon-outline' }
> = {
  next: { label: 'Move to Today', hint: 'Back to the Next up list.', icon: 'list-outline' },
  shopping: { label: 'Move to Shopping', hint: 'Things to buy, on their own tab.', icon: 'cart-outline' },
  someday: { label: 'Move to Later', hint: 'Someday. Out of sight, never overdue.', icon: 'moon-outline' },
};

interface TaskActionSheetProps {
  task: TaskEntry;
  list: TaskList;
  focused: boolean;
  /** False when 3 tasks are already picked for the day. */
  canFocus: boolean;
  onClose: () => void;
  onEdit: () => void;
  /** Starts select mode with this task ticked, to edit or move several at once. */
  onSelect: () => void;
  onToggleFocus: () => void;
  /** Opens the "Bugged me" log sheet for this task. */
  onBug: () => void;
  onBugHistory: () => void;
  onMove: (list: TaskList) => void;
  onDelete: () => void;
}

/** Long-press menu for a task: Edit, pick for Today's 3, move between tabs, Delete. */
export function TaskActionSheet({
  task,
  list,
  focused,
  canFocus,
  onClose,
  onEdit,
  onSelect,
  onToggleFocus,
  onBug,
  onBugHistory,
  onMove,
  onDelete,
}: TaskActionSheetProps) {
  const insets = useSafeAreaInsets();
  const moveTargets = (Object.keys(MOVE_OPTIONS) as TaskList[]).filter(target => target !== list);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <SheetOption
            icon="create-outline"
            label="Edit"
            onPress={onEdit}
          />
          {task.completedDates.length === 0 && (
            <SheetOption
              icon="flame-outline"
              label="Bugged me +1"
              hint="Log that this bothered you again."
              onPress={onBug}
            />
          )}
          {(task.bugs?.length ?? 0) > 0 && (
            <SheetOption
              icon="time-outline"
              label={`Bug history (${task.bugs?.length})`}
              onPress={onBugHistory}
            />
          )}
          <SheetOption
            icon="checkbox-outline"
            label="Select"
            hint="Pick several tasks to edit or move together."
            onPress={onSelect}
          />
          {(focused || canFocus) && (
            <SheetOption
              icon={focused ? 'remove-circle-outline' : 'flag-outline'}
              label={focused ? "Remove from Today's 3" : "Add to Today's 3"}
              hint={focused ? undefined : `Pick up to ${TODAY_FOCUS_LIMIT} to focus on today.`}
              onPress={onToggleFocus}
            />
          )}
          {moveTargets.map(target => (
            <SheetOption
              key={target}
              icon={MOVE_OPTIONS[target].icon}
              label={MOVE_OPTIONS[target].label}
              hint={MOVE_OPTIONS[target].hint}
              onPress={() => onMove(target)}
            />
          ))}
          <SheetOption
            icon="trash-outline"
            label="Delete…"
            danger
            onPress={onDelete}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
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
  title: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
});
