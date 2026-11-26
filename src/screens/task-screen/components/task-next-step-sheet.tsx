import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';
import { formatDateDisplay } from '../../../utils/date-utils';
import { formatStartTime } from '../../../utils/task-schedule-utils';

interface TaskNextStepSheetProps {
  /** The task being edited; it can't be its own next step. */
  taskId?: string;
  onPick: (taskId: string) => void;
  onClose: () => void;
}

/** Pick which open task comes right after this one. */
export function TaskNextStepSheet({ taskId, onPick, onClose }: TaskNextStepSheetProps) {
  const insets = useSafeAreaInsets();
  const allTasks = useBehaviorStore(state => state.tasks);
  const candidates = useMemo(() => {
    const tasks = allTasks ?? [];
    // Skip tasks that lead back to this one, so chains never loop.
    const leadsBack = new Set<string>();
    let cursor = taskId ? tasks.find(task => task.nextTaskId === taskId) : undefined;
    while (cursor && !leadsBack.has(cursor.id)) {
      leadsBack.add(cursor.id);
      const previous = tasks.find(task => task.nextTaskId === cursor?.id);
      cursor = previous;
    }
    return tasks
      .filter(
        task => task.id !== taskId && !task.archived && task.completedDates.length === 0 && !leadsBack.has(task.id),
      )
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.createdAt - b.createdAt);
  }, [allTasks, taskId]);

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
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Next step</Text>
          <Text style={styles.hint}>It will always start when this task ends.</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {candidates.length === 0 && <Text style={styles.hint}>No other open tasks yet.</Text>}
            {candidates.map(task => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onPick(task.id)}
                accessibilityRole="button"
                accessibilityLabel={`Next step ${task.title}`}
              >
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <Text
                  style={styles.rowMeta}
                  numberOfLines={1}
                >
                  {`${formatDateDisplay(task.scheduledDate).replace(/, \d{4}$/, '')}${task.startTime ? ` · ${formatStartTime(task.startTime)}` : ''}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
    maxHeight: '75%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bg.input },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 13 },
  list: { gap: 6 },
  row: { backgroundColor: Colors.bg.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  rowTitle: { color: Colors.text.primary, fontSize: 15 },
  rowMeta: { color: Colors.text.muted, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
