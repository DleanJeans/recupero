import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { formatDateDisplay, toDateString } from '../../../utils/date-utils';
import { getLogEndTimestamp } from '../../../utils/log-utils';
import { pickTaskTime } from '../../../utils/task-date-pick';
import { formatStartTime, getTaskActualTime, toStartTime, withTimeOfDay } from '../../../utils/task-schedule-utils';
import { formatTimeRange } from '../../../utils/time-utils';
import { AttachRow } from './task-attach-row';

const RECENT_LOGS = 8;

interface TaskDoneTimeSheetProps {
  task: TaskEntry;
  behavior: BehaviorEntry | undefined;
  /** The day the task was ticked off. */
  dateStr: string;
  onClose: () => void;
}

function RowIcon({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <Ionicons
      name={name}
      size={18}
      color={Colors.text.muted}
    />
  );
}

/** Edit when a finished task was done (start and end), or assign one of the behavior's logs to it. */
export function TaskDoneTimeSheet({ task, behavior, dateStr, onClose }: TaskDoneTimeSheetProps) {
  const insets = useSafeAreaInsets();
  const setTaskDoneTime = useBehaviorStore(state => state.setTaskDoneTime);
  const assignTaskLog = useBehaviorStore(state => state.assignTaskLog);
  const actual = useMemo(() => getTaskActualTime(task, behavior, dateStr), [task, behavior, dateStr]);
  const [start, setStart] = useState<number | undefined>(actual?.start);
  const [end, setEnd] = useState<number>(actual?.end ?? Date.now());
  const invalid = start != null && start >= end;
  const currentLogId = task.completionLogIds?.[dateStr];
  const recentLogs = useMemo(
    () =>
      [...(behavior?.logs ?? [])]
        .filter(log => log.id !== currentLogId)
        .sort((a, b) => getLogEndTimestamp(b) - getLogEndTimestamp(a))
        .slice(0, RECENT_LOGS),
    [behavior, currentLogId],
  );

  const save = () => {
    setTaskDoneTime(task.id, dateStr, start, end);
    onClose();
  };

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
            {task.title}
          </Text>
          <View style={styles.rows}>
            <AttachRow
              icon={<RowIcon name="play-outline" />}
              label="Start"
              value={start != null ? formatStartTime(toStartTime(new Date(start))) : undefined}
              onPress={() =>
                pickTaskTime(toStartTime(new Date(start ?? end)), time => setStart(withTimeOfDay(start ?? end, time)))
              }
              onClear={start != null ? () => setStart(undefined) : undefined}
            />
            <AttachRow
              icon={<RowIcon name="stop-outline" />}
              label="Done"
              value={formatStartTime(toStartTime(new Date(end)))}
              onPress={() => pickTaskTime(toStartTime(new Date(end)), time => setEnd(withTimeOfDay(end, time)))}
              last
            />
          </View>
          {invalid && <Text style={styles.warning}>Start must be before the done time.</Text>}
          <Button
            variant="primary"
            onPress={save}
            disabled={invalid}
          >
            Save time
          </Button>

          {behavior && recentLogs.length > 0 && (
            <>
              <Text style={styles.heading}>Or use a log of {behavior.name}</Text>
              <ScrollView
                style={styles.logs}
                contentContainerStyle={styles.logsContent}
              >
                {recentLogs.map(log => {
                  const logEnd = getLogEndTimestamp(log);
                  const label = `${formatDateDisplay(toDateString(new Date(log.timestamp))).replace(/, \d{4}$/, '')} · ${formatTimeRange(log.timestamp, log.endTimestamp != null && log.endTimestamp > log.timestamp ? logEnd : undefined)}`;
                  return (
                    <Pressable
                      key={log.id}
                      style={({ pressed }) => [styles.logRow, pressed && styles.pressed]}
                      onPress={() => {
                        assignTaskLog(task.id, dateStr, log.id);
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Use log ${label}`}
                    >
                      <Text
                        style={styles.logText}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
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
    gap: 12,
    maxHeight: '85%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bg.input },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  rows: { backgroundColor: Colors.bg.input, borderRadius: 12, overflow: 'hidden' },
  warning: { color: Colors.status.dangerLight, fontSize: 13 },
  heading: { color: Colors.text.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  logs: { flexGrow: 0 },
  logsContent: { gap: 6 },
  logRow: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  logText: { color: Colors.text.primary, fontSize: 14 },
  pressed: { opacity: 0.7 },
});
