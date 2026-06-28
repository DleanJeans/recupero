import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SwipeDeleteButton, SwipeEditButton } from '../../../components/SwipeActionButton';
import { Text } from '../../../components/Text';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { LogEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { formatMetadataValueUnit } from '../../../utils/metadataCalculationUtils';
import { formatElapsedNumeric, formatTime } from '../../../utils/timeUtils';

interface Props {
  log: LogEntry;
  behaviorId: string;
  onEdit: () => void;
  metadataFields?: MetadataField[];
  elapsedTick: number;
}

export const BehaviorLogItem = React.memo(function BehaviorLogItem({
  log,
  behaviorId,
  onEdit,
  metadataFields,
  elapsedTick,
}: Props) {
  const removeLog = useBehaviorStore(state => state.removeLog);
  const timeFormat = useSettingsStore(state => state.timeFormat);
  const timeText = useMemo(() => formatTime(log.timestamp, timeFormat === '12h'), [log.timestamp, timeFormat]);
  const elapsedText = useMemo(() => formatElapsedNumeric(log.timestamp), [log.timestamp, elapsedTick]);

  const handleRemove = useCallback(() => {
    Alert.alert('Remove Log', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeLog(behaviorId, log.id),
      },
    ]);
  }, [behaviorId, log.id, removeLog]);

  const renderLeftActions = useCallback(() => <SwipeDeleteButton onPress={handleRemove} />, [handleRemove]);
  const renderRightActions = useCallback(() => <SwipeEditButton onPress={onEdit} />, [onEdit]);

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
          <Text style={styles.dateText}>{timeText}</Text>
          <Text style={styles.elapsedText}>{elapsedText}</Text>
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
                  {formatMetadataValueUnit(field)}
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
});

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
});
