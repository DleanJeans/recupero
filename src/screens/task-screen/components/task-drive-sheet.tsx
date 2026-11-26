import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { getDriveEstimateMin } from '../../../utils/drive-estimate-utils';
import { findDrivingBehaviorId, recordDrive } from '../../../utils/driving-utils';
import { pickTaskTime } from '../../../utils/task-date-pick';
import { formatStartTime, toStartTime, withTimeOfDay } from '../../../utils/task-schedule-utils';
import { AttachRow } from './task-attach-row';

interface TaskDriveSheetProps {
  task: TaskEntry;
  placeName: string;
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

/** Log a drive to the task's place that already happened and isn't on the timeline yet. */
export function TaskDriveSheet({ task, placeName, onClose }: TaskDriveSheetProps) {
  const insets = useSafeAreaInsets();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const tasks = useBehaviorStore(state => state.tasks);
  const estimate = useMemo(() => {
    const drivingId = findDrivingBehaviorId(behaviors);
    return getDriveEstimateMin(
      task,
      tasks ?? [],
      behaviors.find(behavior => behavior.id === drivingId),
    );
  }, [behaviors, tasks, task]);
  const [end, setEnd] = useState(() => task.drive?.end ?? Date.now());
  const [start, setStart] = useState(() => task.drive?.start ?? Date.now() - estimate * 60000);
  const invalid = start >= end;

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
            {`Log a drive to ${placeName}`}
          </Text>
          <View style={styles.rows}>
            <AttachRow
              icon={<RowIcon name="play-outline" />}
              label="Left"
              value={formatStartTime(toStartTime(new Date(start)))}
              onPress={() => pickTaskTime(toStartTime(new Date(start)), time => setStart(withTimeOfDay(start, time)))}
            />
            <AttachRow
              icon={<RowIcon name="stop-outline" />}
              label="Arrived"
              value={formatStartTime(toStartTime(new Date(end)))}
              onPress={() => pickTaskTime(toStartTime(new Date(end)), time => setEnd(withTimeOfDay(end, time)))}
              last
            />
          </View>
          {invalid && <Text style={styles.warning}>Left must be before arrived.</Text>}
          <Button
            variant="primary"
            disabled={invalid}
            onPress={() => {
              recordDrive(task.id, start, end);
              onClose();
            }}
          >
            Log drive
          </Button>
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
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bg.input },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  rows: { backgroundColor: Colors.bg.input, borderRadius: 12, overflow: 'hidden' },
  warning: { color: Colors.status.dangerLight, fontSize: 13 },
});
