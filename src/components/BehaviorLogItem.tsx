import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useBehaviorStore } from '../store/behaviorStore';
import type { LogEntry } from '../types/behavior';
import { formatElapsedNumeric, formatTime } from '../utils/timeUtils';
import { Text } from './Text';

interface Props {
  log: LogEntry;
  behaviorId: string;
  onEdit: () => void;
}

function toDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BehaviorLogItem({ log, behaviorId, onEdit }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const { removeLog } = useBehaviorStore();

  const handleRemove = () => {
    Alert.alert('Remove Log', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeLog(behaviorId, log.id),
      },
    ]);
  };

  const renderLeftActions = () => (
    <Pressable
      style={({ pressed }) => [
        styles.leftAction,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={handleRemove}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.actionText}>Delete</Text>
    </Pressable>
  );

  const renderRightActions = () => (
    <Pressable
      style={({ pressed }) => [
        styles.rightAction,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={onEdit}
    >
      <Ionicons
        name="create-outline"
        size={24}
        color="#fff"
      />
      <Text style={styles.actionText}>Edit</Text>
    </Pressable>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        style={styles.logItem}
        onLongPress={onEdit}
        delayLongPress={300}
      >
        <View style={styles.logContent}>
          <Text style={styles.dateText}>
            {formatTime(log.timestamp)}
          </Text>
          <Text style={styles.elapsedText}>{formatElapsedNumeric(log.timestamp)}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  logContent: {
    flex: 1,
    padding: 16,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  elapsedText: {
    color: '#888',
    fontSize: 13,
  },
  leftAction: {
    backgroundColor: '#943030',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 6,
    marginLeft: 16,
    marginRight: -48,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingRight: 28,
  },
  rightAction: {
    backgroundColor: '#3a6ea5',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 6,
    marginRight: 16,
    marginLeft: -48,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingLeft: 28,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
