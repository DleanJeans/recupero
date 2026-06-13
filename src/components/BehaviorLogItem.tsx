import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useBehaviorStore } from '../store/behaviorStore';
import { useSettingsStore } from '../store/settingsStore';
import type { LogEntry, MetadataField } from '../types/behavior';
import { Colors } from '../utils/colors';
import { formatElapsedNumeric, formatTime } from '../utils/timeUtils';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  log: LogEntry;
  behaviorId: string;
  onEdit: () => void;
  metadataFields?: MetadataField[];
}

export function BehaviorLogItem({ log, behaviorId, onEdit, metadataFields }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const { removeLog } = useBehaviorStore();
  const { timeFormat } = useSettingsStore();

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
    <Button
      variant="danger"
      onPress={handleRemove}
      style={styles.leftAction}
    >
      <Ionicons
        name="trash"
        size={24}
        color={Colors.text.primary}
      />
      <Text style={styles.actionText}>Delete</Text>
    </Button>
  );

  const renderRightActions = () => (
    <Button
      variant="danger"
      onPress={onEdit}
      style={styles.rightAction}
    >
      <Ionicons
        name="create-outline"
        size={24}
        color={Colors.text.primary}
      />
      <Text style={styles.actionText}>Edit</Text>
    </Button>
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
        <View style={styles.timeContent}>
          <Text style={styles.dateText}>{formatTime(log.timestamp, timeFormat === '12h')}</Text>
          <Text style={styles.elapsedText}>{formatElapsedNumeric(log.timestamp)}</Text>
        </View>
        <View style={log.metadata ? styles.contentArea : undefined}>
          {metadataFields?.map(field => {
            const val = log.metadata?.[field.key];
            if (val == null) return null;
            return (
              <View
                key={field.key}
                style={styles.metaChip}
              >
                <Text style={styles.metaChipText}>
                  {field.label} {val}
                  {field.unit ?? ''}
                </Text>
              </View>
            );
          })}
          {log.metadata?.notes ? (
            <View style={styles.notesContent}>
              <Text
                style={styles.notesText}
                numberOfLines={2}
              >
                {String(log.metadata.notes)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  timeContent: {
    flex: 2,
    padding: 16,
  },
  contentArea: {
    flex: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.text.faint,
  },
  metaChip: {
    backgroundColor: Colors.bg.darker,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaChipText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  notesContent: {
    width: '100%',
  },
  notesText: {
    color: Colors.text.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  dateText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeText: {
    color: Colors.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  elapsedText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  leftAction: {
    backgroundColor: Colors.status.danger,
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
    backgroundColor: Colors.status.info,
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
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
