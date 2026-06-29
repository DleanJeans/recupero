import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/BehaviorIcon';
import { StarRow } from '../../../components/StarRow';
import { Text } from '../../../components/Text';
import type { BehaviorEntry, Category, LogEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getLogDurationMs, hasTimedLogRange } from '../../../utils/logUtils';
import { formatMetadataValueUnit } from '../../../utils/metadataCalculationUtils';
import { roundTo2 } from '../../../utils/numberUtils';
import { formatDuration, formatTime, formatTimeRange, MS_PER_MINUTE } from '../../../utils/timeUtils';

interface DayLogEntry {
  log: LogEntry;
  behavior: BehaviorEntry;
}

interface LogListProps {
  entries: DayLogEntry[];
  selectedDate: string;
  categories: Category[];
}

function formatEntryMetadata(
  metadata: LogEntry['metadata'],
  behavior: BehaviorEntry,
  categories: Category[],
): React.ReactNode | null {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const category = categories.find(c => c.id === behavior.categoryId);
  const fields = category?.metadataFields ?? [];
  const parts: string[] = [];

  if (metadata.notes) {
    parts.push(String(metadata.notes));
  }

  for (const field of fields) {
    if (field.key === 'notes') continue;
    const val = metadata[field.key];
    if (val != null) {
      const displayVal = typeof val === 'number' ? roundTo2(val) : val;
      parts.push(`${field.label}: ${displayVal}${formatMetadataValueUnit(field)}`);
    }
  }

  return parts.length > 0 ? (
    <Text
      style={styles.logMetadata}
      numberOfLines={2}
    >
      {parts.join(' · ')}
    </Text>
  ) : null;
}

export function LogList({ entries, selectedDate, categories }: LogListProps) {
  const minuteGroups = React.useMemo(() => {
    const groups: { minuteTimestamp: number; entries: DayLogEntry[] }[] = [];
    for (const entry of entries) {
      const minuteKey = Math.floor(entry.log.timestamp / MS_PER_MINUTE);
      const last = groups[groups.length - 1];
      if (last && Math.floor(last.minuteTimestamp / MS_PER_MINUTE) === minuteKey) {
        last.entries.push(entry);
      } else {
        groups.push({ minuteTimestamp: entry.log.timestamp, entries: [entry] });
      }
    }
    return groups;
  }, [entries]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {entries.length === 0 ? (
        <Text style={styles.empty}>No logs for this date.</Text>
      ) : (
        minuteGroups.map((group, gi) => {
          const prevGroup = gi > 0 ? minuteGroups[gi - 1] : null;
          const gap = prevGroup ? prevGroup.minuteTimestamp - group.minuteTimestamp : null;
          const showGap = gap != null && gap >= MS_PER_MINUTE;

          return (
            <View key={group.minuteTimestamp}>
              {showGap && gi > 0 && (
                <View style={styles.gapRow}>
                  <View style={styles.gapDot} />
                  <Text style={styles.gapText}>{formatDuration(gap!)}</Text>
                  <View style={styles.gapDot} />
                </View>
              )}

              <View style={styles.logRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{formatTime(group.minuteTimestamp)}</Text>
                </View>

                <View style={styles.logContent}>
                  {group.entries.map((entry, ei) => (
                    <React.Fragment key={entry.log.id}>
                      {ei > 0 && <View style={styles.entrySep} />}
                      <View style={styles.entryRow}>
                        <View style={styles.entryInlineRow}>
                          <BehaviorIcon
                            behavior={entry.behavior}
                            size={14}
                          />
                          <Text
                            style={styles.behaviorName}
                            numberOfLines={1}
                          >
                            {entry.behavior.name}
                          </Text>
                          <StarRow
                            behavior={entry.behavior}
                            dateStr={selectedDate}
                            size={12}
                            style={{ marginTop: -12 }}
                          />
                        </View>
                        {hasTimedLogRange(entry.log) && (
                          <Text style={styles.sessionText}>
                            {formatTimeRange(entry.log.timestamp, entry.log.endTimestamp)} ·{' '}
                            {formatDuration(getLogDurationMs(entry.log))}
                          </Text>
                        )}
                        {formatEntryMetadata(entry.log.metadata, entry.behavior, categories)}
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logMetadata: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  sessionText: {
    color: Colors.text.faint,
    fontSize: 12,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 48,
  },
  entryInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  entryRow: {
    flexDirection: 'column',
    gap: 2,
  },
  entrySep: {
    height: 6,
  },
  timeCol: {
    width: 70,
    justifyContent: 'center',
  },
  timeText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  logContent: {
    flex: 1,
  },
  behaviorName: {
    color: Colors.text.primary,
    fontSize: 15,
    marginTop: 2,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  gapDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.light,
  },
  gapText: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '500',
  },
});
