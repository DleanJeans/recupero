import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { BUG_NUDGE_COUNT, BUG_NUDGE_WINDOW_DAYS, getNudgeBugCount } from '../../../utils/task-bug-utils';

interface BugNudgeCardProps {
  task: TaskEntry;
  onAdd: () => void;
  onDismiss: () => void;
}

/** Asks to pick a task for Today's 3 once it bugged the user a few times in two weeks. */
export function BugNudgeCard({ task, onAdd, onDismiss }: BugNudgeCardProps) {
  const count = Math.max(BUG_NUDGE_COUNT, getNudgeBugCount(task, Date.now()));
  return (
    <View style={styles.card}>
      <Text style={styles.text}>
        <Text style={styles.title}>{task.title}</Text> bugged you {count}× in {BUG_NUDGE_WINDOW_DAYS / 7} weeks. Add it
        to Today's 3?
      </Text>
      <View style={styles.row}>
        <Button
          variant="ghost"
          size="sm"
          onPress={onDismiss}
        >
          Not now
        </Button>
        <Button
          variant="primary"
          size="sm"
          onPress={onAdd}
        >
          Add
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2B1A10',
    borderWidth: 1,
    borderColor: '#7C2D12',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    gap: 10,
  },
  text: { color: Colors.text.primary, fontSize: 14, lineHeight: 20 },
  title: { color: '#FDBA74', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
