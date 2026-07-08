import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { LogEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getLogDurationMs, getLogEndTimestamp, hasTimedLogRange } from '../../../utils/log-utils';
import { formatMetadataValueUnit } from '../../../utils/metadata-calculation-utils';
import { formatDuration, formatElapsedNumeric, formatTimeRange } from '../../../utils/time-utils';

interface Props {
  log: LogEntry;
  onEdit: () => void;
  metadataFields?: MetadataField[];
  elapsedTick: number;
  isDecayed?: boolean;
}

export const BehaviorLogItem = React.memo(function BehaviorLogItem({
  log,
  onEdit,
  metadataFields,
  elapsedTick,
  isDecayed = false,
}: Props) {
  const timeFormat = useSettingsStore(state => state.timeFormat);
  const timeText = useMemo(
    () => formatTimeRange(log.timestamp, log.endTimestamp, timeFormat === '12h'),
    [log.endTimestamp, log.timestamp, timeFormat],
  );
  const isRange = hasTimedLogRange(log);
  const elapsedText = useMemo(() => formatElapsedNumeric(getLogEndTimestamp(log)), [elapsedTick, log]);
  const durationText = useMemo(
    () => (isRange ? formatDuration(getLogDurationMs(log)) : undefined),
    [log, isRange],
  );

  const handlePress = useCallback(() => onEdit(), [onEdit]);

  return (
    <Pressable
      style={[styles.logItem, isRange && styles.logItemRange, isDecayed && styles.decayedLogItem]}
      onPress={handlePress}
    >
        <View style={[styles.timeContent, isRange && styles.timeContentRange]}>
          <Text style={[styles.dateText, isDecayed && styles.decayedText]}>
            {timeText}
            {durationText ? <Text style={[styles.timeText, isDecayed && styles.decayedText]}> ({durationText})</Text> : null}
          </Text>
          <Text style={[styles.elapsedText, isDecayed && styles.decayedText]}>{elapsedText}</Text>
        </View>
        {log.metadata ? <View style={[styles.separator, isRange && styles.separatorRange]} /> : null}
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
  );
});

const styles = StyleSheet.create({
  logItem: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  logItemRange: {
    flexDirection: 'column',
  },
  decayedLogItem: {
    backgroundColor: Colors.status.error,
  },
  timeContent: {
    flex: 2,
    padding: 16,
    justifyContent: 'center',
  },
  timeContentRange: {
    justifyContent: 'flex-start',
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    height: '50%',
    backgroundColor: Colors.text.faint,
  },
  separatorRange: {
    width: '50%',
    height: StyleSheet.hairlineWidth,
  },
  contentArea: {
    flex: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 6,
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
  decayedText: {
    color: Colors.status.dangerLight,
  },
});
