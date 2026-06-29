import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { useBehaviorStore } from '../../../store/behaviorStore';
import type { BehaviorEntry } from '../../../types/behavior';
import { groupLogsByRecency } from '../../../utils/behaviorUtils';
import { Colors } from '../../../utils/colors';
import { getLogGapBounds } from '../../../utils/logUtils';
import { BehaviorLogItem } from './BehaviorLogItem';
import { LogGap } from './LogGap';

interface BehaviorLogListProps {
  behavior: BehaviorEntry;
  onEditLog: (logId: string) => void;
}

export function BehaviorLogList({ behavior, onEditLog }: BehaviorLogListProps) {
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const [elapsedTick, setElapsedTick] = useState(0);

  const logs = behavior.logs ?? [];
  const sections = useMemo(() => groupLogsByRecency(logs), [logs]);
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
              />
            );
          })()}
        <BehaviorLogItem
          log={item}
          behaviorId={behavior.id}
          metadataFields={metadataFields}
          elapsedTick={elapsedTick}
          onEdit={() => onEditLog(item.id)}
        />
      </>
    ),
    [behavior.id, behavior.xpDecay, elapsedTick, metadataFields, onEditLog],
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
                  style={styles.logGapAbsolute}
                />
              );
            })()}
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
      );
    },
    [behavior.xpDecay, sections],
  );

  const listEmptyComponent = useMemo(
    () => <Text style={styles.empty}>No logs yet.{'\n'}Press Log below to record this behavior.</Text>,
    [],
  );
  const contentContainerStyle = useMemo(
    () => [logs.length === 0 && styles.emptyContainer, { paddingBottom: 80 }],
    [logs.length],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

const styles = StyleSheet.create({
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
