import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { StarRow } from '../../../components/star-row';
import { Text } from '../../../components/text';
import type { Category } from '../../../types/behavior';
import type { DayLogEntry } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { getLogDurationMs, hasTimedLogRange } from '../../../utils/log-utils';
import { formatMetadataValueUnit } from '../../../utils/metadata-calculation-utils';
import { roundTo2 } from '../../../utils/number-utils';
import { formatDuration, formatTime, formatTimeRange } from '../../../utils/time-utils';

interface DayLogCardProps {
  entry: DayLogEntry;
  selectedDate: string;
  categories: Category[];
  onEditLog: (behaviorId: string, logId: string) => void;
}

export function DayLogCard({ entry, selectedDate, categories, onEditLog }: DayLogCardProps) {
  const { behavior, log } = entry;
  const category = categories.find(item => item.id === behavior.categoryId);
  const metadataFields = category?.metadataFields ?? [];
  const metadataRows = metadataFields
    .filter(field => field.key !== 'notes' && log.metadata?.[field.key] != null)
    .map(field => {
      const value = log.metadata?.[field.key];
      return {
        key: field.key,
        label: field.label,
        value: typeof value === 'number' ? roundTo2(value) : String(value),
        unit: formatMetadataValueUnit(field),
      };
    });
  const notes = log.metadata?.notes;
  const hasNotes = notes != null && String(notes).trim().length > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onLongPress={() => onEditLog(behavior.id, log.id)}
      delayLongPress={150}
      accessibilityRole="button"
      accessibilityLabel={`${behavior.name} logged at ${formatTime(log.timestamp)}`}
    >
      <View style={styles.header}>
        <BehaviorIcon
          behavior={behavior}
          size={21}
        />
        <Text
          selectable
          style={styles.behaviorName}
          numberOfLines={2}
        >
          {behavior.name}
        </Text>
        <View style={styles.headerRight}>
          <StarRow
            behavior={behavior}
            dateStr={selectedDate}
            size={13}
          />
          <Text
            selectable
            style={styles.timeBadge}
          >
            {formatTime(log.timestamp)}
          </Text>
        </View>
      </View>

      {hasTimedLogRange(log) && (
        <Text style={styles.sessionText}>
          {formatTimeRange(log.timestamp, log.endTimestamp)} · {formatDuration(getLogDurationMs(log))}
        </Text>
      )}

      {metadataRows.length > 0 && (
        <View style={styles.metadataWells}>
          {metadataRows.map(row => (
            <View
              key={row.key}
              style={styles.metadataWell}
            >
              <Text style={styles.metadataLabel}>{row.label}</Text>
              <Text
                selectable
                style={styles.metadataValue}
              >
                {row.value}
              </Text>
              {row.unit ? <Text style={styles.metadataUnit}>{row.unit}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {hasNotes && <Text style={styles.notes}>{String(notes)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardPressed: {
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.border.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  behaviorName: {
    flex: 1,
    minWidth: 0,
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 5,
  },
  timeBadge: {
    color: Colors.text.faint,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sessionText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  metadataWells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metadataWell: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    backgroundColor: Colors.bg.dark,
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metadataLabel: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metadataValue: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metadataUnit: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  notes: {
    color: Colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
