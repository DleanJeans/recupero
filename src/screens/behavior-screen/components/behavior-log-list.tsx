import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { groupLogsByRecency } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { getLogGapBounds } from '../../../utils/log-utils';
import { getDecayedLogs } from '../../../utils/xp-utils';
import { BehaviorLogItem } from './behavior-log-item';
import { DecayedXPSummary } from './decayed-xp-summary';
import { HabitXPBars } from './habit-xp-bars';
import { LogGap } from './log-gap';

interface BehaviorLogListProps {
  behavior: BehaviorEntry;
  onEditLog: (logId: string) => void;
}

export function BehaviorLogList({ behavior, onEditLog }: BehaviorLogListProps) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const [elapsedTick, setElapsedTick] = useState(0);

  const logs = behavior.logs ?? [];
  const now = useMemo(() => Date.now(), [elapsedTick]);
  const sections = useMemo(() => groupLogsByRecency(logs, dayCutoffHour), [dayCutoffHour, logs]);
  const decayedLogIds = useMemo(
    () => new Set(getDecayedLogs(behavior, now, dayCutoffHour).map(log => log.id)),
    [behavior, dayCutoffHour, now],
  );
  const metadataFields = category?.metadataFields;

  useEffect(() => {
    const interval = setInterval(() => setElapsedTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: BehaviorEntry['logs'][number];
      index: number;
      section: { data: BehaviorEntry['logs'] };
    }) => (
      <>
        {index > 0 &&
          (() => {
            const { earlierMs, laterMs } = getLogGapBounds(item, section.data[index - 1]);
            return (
              <LogGap
                earlierMs={earlierMs}
                laterMs={laterMs}
                xpDecay={behavior.xpDecay}
                dayCutoffHour={dayCutoffHour}
              />
            );
          })()}
        <BehaviorLogItem
          log={item}
          metadataFields={metadataFields}
          elapsedTick={elapsedTick}
          isDecayed={decayedLogIds.has(item.id)}
          onEdit={() => onEditLog(item.id)}
        />
      </>
    ),
    [behavior.xpDecay, dayCutoffHour, decayedLogIds, elapsedTick, metadataFields, onEditLog],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: (typeof sections)[number] }) => {
      const sectionIdx = sections.indexOf(section);
      const prevLast = sectionIdx > 0 ? sections[sectionIdx - 1].data.at(-1) : undefined;
      const showDistance = prevLast != null && section.data.length > 0;

      return (
        <View style={[styles.sectionHeader, sectionIdx > 0 && styles.sectionHeaderWithDistance]}>
          {showDistance &&
            (() => {
              const { earlierMs, laterMs } = getLogGapBounds(section.data[0], prevLast!);
              return (
                <LogGap
                  earlierMs={earlierMs}
                  laterMs={laterMs}
                  xpDecay={behavior.xpDecay}
                  dayCutoffHour={dayCutoffHour}
                  style={styles.logGapAbsolute}
                />
              );
            })()}
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
      );
    },
    [behavior.xpDecay, dayCutoffHour, sections],
  );

  const listEmptyComponent = useMemo(
    () => <Text style={styles.empty}>No logs yet.{'\n'}Press Log below to record this behavior.</Text>,
    [],
  );
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        <HabitXPBars behavior={behavior} />
        <DecayedXPSummary
          behavior={behavior}
          now={now}
        />
      </View>
    ),
    [behavior, now],
  );
  const contentContainerStyle = useMemo(
    () => [styles.listContent, logs.length === 0 && styles.emptyContainer],
    [logs.length],
  );

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={listHeaderComponent}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  listHeader: {
    paddingBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 16,
    overflow: 'visible',
  },
  sectionHeaderWithDistance: {
    marginTop: 0,
    minHeight: 40,
  },
  logGapAbsolute: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
  },
  sectionHeaderText: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 'auto',
  },
});
