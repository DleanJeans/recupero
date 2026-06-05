import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { LogEntry } from '../types/behavior';
import { formatDateDisplay } from '../utils/dateUtils';
import { formatElapsed, formatTime } from '../utils/timeUtils';
import { Text } from './Text';

interface Props {
  log: LogEntry;
  onRemove: () => void;
  onEdit: () => void;
}

function toDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BehaviorLogItem({ log, onRemove, onEdit }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const renderLeftActions = () => (
    <Pressable
      style={({ pressed }) => [
        styles.deleteButton,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={() => onRemove()}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  );

  const dateString = toDateString(log.timestamp);

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      overshootLeft={false}
    >
      <View style={styles.logItem}>
        <View style={styles.logContent}>
          <Text style={styles.dateText}>{formatDateDisplay(dateString)}</Text>
          <Text style={styles.timeText}>{formatTime(log.timestamp)}</Text>
          <Text style={styles.elapsedText}>{formatElapsed(log.timestamp)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.editBtn,
            pressed && styles.editBtnPressed,
          ]}
          onPress={onEdit}
          accessibilityLabel="Edit log"
        >
          <Ionicons
            name="create-outline"
            size={24}
            color="#ccc"
          />
        </Pressable>
      </View>
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
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnPressed: {
    opacity: 0.5,
    transform: [
      {
        scale: 0.92,
      },
    ],
  },
  deleteButton: {
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
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
