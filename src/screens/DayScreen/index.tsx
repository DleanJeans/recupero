import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../components/BehaviorIcon';
import { BottomNav } from '../../components/BottomNav';
import { DatePicker } from '../../components/DatePicker';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { StarRow } from '../../components/StarRow';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { Category, LogEntry } from '../../types/behavior';
import { getAllDailyMetadataTotals } from '../../utils/behaviorUtils';
import { Colors } from '../../utils/colors';
import { describeDay, toDateString } from '../../utils/dateUtils';
import { roundTo2 } from '../../utils/numberUtils';
import { getThresholds, getTotalStarsForDate } from '../../utils/starUtils';
import { getTaskStarsForDate } from '../../utils/taskUtils';
import { formatDuration, formatTime, MS_PER_MINUTE } from '../../utils/timeUtils';

function formatEntryMetadata(
  metadata: LogEntry['metadata'],
  categoryId: string | undefined,
  categories: Category[],
): React.ReactNode | null {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const category = categories.find(c => c.id === categoryId);
  const fields = category?.metadataFields ?? [];
  const parts: string[] = [];

  // Notes first
  if (metadata.notes) {
    parts.push(String(metadata.notes));
  }

  // Numeric metadata fields
  for (const field of fields) {
    if (field.key === 'notes') continue;
    const val = metadata[field.key];
    if (val != null) {
      const displayVal = typeof val === 'number' ? roundTo2(val) : val;
      parts.push(`${field.label}: ${displayVal}${field.unit ? ` ${field.unit}` : ''}`);
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

export function DayScreen() {
  const { behaviors, categories, tasks } = useBehaviorStore();

  const todayStr = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Logs for the selected date
  const dayLogs = useMemo(() => {
    const entries: {
      log: { id: string; timestamp: number; metadata?: Record<string, string | number> };
      behavior: (typeof behaviors)[number];
    }[] = [];

    for (const behavior of behaviors) {
      for (const log of behavior.logs) {
        const logDate = toDateString(new Date(log.timestamp));
        if (logDate === selectedDate) {
          entries.push({ log, behavior });
        }
      }
    }

    entries.sort((a, b) => b.log.timestamp - a.log.timestamp);
    return entries;
  }, [behaviors, selectedDate]);

  // Total entry count
  const totalEntries = dayLogs.length;

  // Metadata totals for the selected date
  const metadataTotals = useMemo(() => {
    return getAllDailyMetadataTotals(behaviors, categories, selectedDate);
  }, [behaviors, categories, selectedDate]);

  // Earliest and latest log for duration calculation
  const daySpan = useMemo(() => {
    if (dayLogs.length === 0) return null;
    const timestamps = dayLogs.map(e => e.log.timestamp);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    return { first: minTs, last: maxTs, spanMs: maxTs - minTs };
  }, [dayLogs]);

  // Star rating: total across opted-in behaviors and completed tasks for the selected date.
  // Summary item renders when either source contributed stars.
  const hasOptedInLog = useMemo(() => dayLogs.some(entry => getThresholds(entry.behavior) !== undefined), [dayLogs]);
  const taskStars = useMemo(() => getTaskStarsForDate(tasks, selectedDate), [tasks, selectedDate]);
  const totalStars = useMemo(() => {
    const behaviorStars = hasOptedInLog ? getTotalStarsForDate(behaviors, selectedDate) : 0;
    return behaviorStars + taskStars;
  }, [behaviors, selectedDate, hasOptedInLog, taskStars]);
  const hasStars = hasOptedInLog || taskStars > 0;

  // Group logs that fall in the same calendar minute so time is shown once
  const minuteGroups = useMemo(() => {
    const groups: { minuteTimestamp: number; entries: typeof dayLogs }[] = [];
    for (const entry of dayLogs) {
      const minuteKey = Math.floor(entry.log.timestamp / MS_PER_MINUTE);
      const last = groups[groups.length - 1];
      if (last && Math.floor(last.minuteTimestamp / MS_PER_MINUTE) === minuteKey) {
        last.entries.push(entry);
      } else {
        groups.push({ minuteTimestamp: entry.log.timestamp, entries: [entry] });
      }
    }
    return groups;
  }, [dayLogs]);

  // Navigate days
  const goToPrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateString(d));
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextStr = toDateString(d);
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const isToday = selectedDate === todayStr;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenTitle>Day</ScreenTitle>
      </View>

      {/* Date selector */}
      <View style={styles.dateRow}>
        <Pressable
          onPress={goToPrevDay}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={Colors.text.primary}
          />
        </Pressable>

        <View style={styles.dateLabelWrap}>
          <DatePicker
            selectedDate={selectedDate}
            maxDate={todayStr}
            onSelect={setSelectedDate}
          />
        </View>

        <Pressable
          onPress={goToNextDay}
          style={[styles.arrowBtn, isToday && styles.arrowDisabled]}
          hitSlop={8}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isToday ? Colors.text.dim : Colors.text.primary}
          />
        </Pressable>
      </View>

      {/* Metadata summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalEntries}</Text>
          <Text style={styles.summaryLabel}>entries</Text>
        </View>
        {hasStars && (
          <View
            style={styles.summaryItem}
            accessible
            accessibilityLabel={`${totalStars} stars on this date`}
          >
            <View style={styles.starSummaryValue}>
              <Ionicons
                name="star"
                size={18}
                color={Colors.star.filled}
              />
              <Text style={styles.summaryValue}>{totalStars}</Text>
            </View>
            <Text style={styles.summaryLabel}>stars</Text>
          </View>
        )}
        {dayLogs.length > 1 && daySpan && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatDuration(daySpan.spanMs)}</Text>
            <Text style={styles.summaryLabel}>span</Text>
          </View>
        )}
        {describeDay(selectedDate) !== '' && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{describeDay(selectedDate)}</Text>
            <Text style={styles.summaryLabel}>when</Text>
          </View>
        )}
      </View>

      {/* Metadata totals */}
      {metadataTotals.length > 0 && (
        <View style={styles.metadataSection}>
          {metadataTotals.map(item => (
            <View
              key={item.label}
              style={styles.metadataRow}
            >
              <Text style={styles.metadataLabel}>{item.label}</Text>
              <Text style={styles.metadataValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Log list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dayLogs.length === 0 ? (
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
                          {formatEntryMetadata(entry.log.metadata, entry.behavior.categoryId, categories)}
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

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },

  // Date selector
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },

  dateLabelWrap: {
    flex: 1,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Metadata totals
  metadataSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  metadataLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  metadataValue: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  logMetadata: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  starSummaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Log list
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

  // Log row
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

  // Gap between logs
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
