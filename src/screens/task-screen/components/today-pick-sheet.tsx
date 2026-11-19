import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { TaskEntry, TaskList } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { FOCUS_BONUS_STARS, TODAY_FOCUS_LIMIT } from '../../../utils/task-utils';
import { TaskRewardChip } from './task-reward-chip';

const LIST_LABELS: Record<TaskList, string> = {
  next: 'Next up',
  shopping: 'Shopping',
  someday: 'Later',
};

export interface TodayPickCandidate {
  task: TaskEntry;
  list: TaskList;
  picked: boolean;
}

interface TodayPickSheetProps {
  candidates: TodayPickCandidate[];
  onToggle: (task: TaskEntry) => void;
  onClose: () => void;
}

/** Sheet for picking up to 3 tasks to focus on today. Picks save as you tap. */
export function TodayPickSheet({ candidates, onToggle, onClose }: TodayPickSheetProps) {
  const insets = useSafeAreaInsets();
  const pickedCount = candidates.filter(candidate => candidate.picked).length;
  const full = pickedCount >= TODAY_FOCUS_LIMIT;

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
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            Pick today's {TODAY_FOCUS_LIMIT}
          </Text>
          <Text
            style={styles.subtitle}
            numberOfLines={2}
          >
            Finish all {TODAY_FOCUS_LIMIT} for +{FOCUS_BONUS_STARS} bonus stars and a day on your streak.
          </Text>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {candidates.length === 0 && <Text style={styles.empty}>No open tasks. Add one first.</Text>}
            {candidates.map(({ task, list, picked }) => {
              const disabled = full && !picked;
              return (
                <Pressable
                  key={task.id}
                  onPress={() => onToggle(task)}
                  disabled={disabled}
                  style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && styles.pressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: picked, disabled }}
                >
                  <Ionicons
                    name={picked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={picked ? Colors.status.successLight : Colors.text.faint}
                  />
                  <View style={styles.rowText}>
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
                      {LIST_LABELS[list]}
                    </Text>
                  </View>
                  {task.stars > 0 && <TaskRewardChip stars={task.stars} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            variant="primary"
            onPress={onClose}
            style={styles.done}
          >
            {pickedCount === 0 ? 'Close' : `Done · ${pickedCount} picked`}
          </Button>
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
    maxHeight: '85%',
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
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 6,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    color: Colors.text.faint,
    fontSize: 12,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    padding: 20,
  },
  done: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
});
