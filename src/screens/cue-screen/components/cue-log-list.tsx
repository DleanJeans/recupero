import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { CueLogEntry } from '../../../types/cue';
import { Colors } from '../../../utils/colors';

interface CueLogListProps {
  logs: CueLogEntry[];
}

export function CueLogList({ logs }: CueLogListProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>RECENT CUES</Text>
      {logs.length === 0 ? (
        <Text style={styles.empty}>No cue changes yet.</Text>
      ) : (
        logs.slice(0, 8).map(log => (
          <View
            key={log.id}
            style={styles.row}
          >
            <Text style={styles.label}>{log.label}</Text>
            <Text style={styles.value}>{formatCueValue(log.value)}</Text>
            <Text style={styles.time}>{formatLogTime(log.timestamp)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function formatCueValue(value: string) {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLogTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    width: 74,
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 13,
  },
});
