import React, { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { Text } from '../../../components/Text';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskEntry } from '../../../types/task';
import { groupBehaviorsByRecency } from '../../../utils/behaviorUtils';
import { Colors } from '../../../utils/colors';
import { toDateString, yesterday } from '../../../utils/dateUtils';
import { Label } from '../../../utils/strings';
import { BehaviorCard } from './BehaviorCard';
import { SectionHeader } from './SectionHeader';

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
  tasks: TaskEntry[];
  selectedCategoryId: string | null;
  searchQuery?: string;
}

export const BehaviorList = React.memo(function BehaviorList({
  behaviors,
  tasks,
  selectedCategoryId,
  searchQuery,
}: BehaviorListProps) {
  const sections = useMemo(() => groupBehaviorsByRecency(behaviors), [behaviors]);
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const yesterdayStr = useMemo(() => toDateString(yesterday()), []);
  const dateForSection = useCallback(
    (title: string): string | undefined => {
      if (title === Label.TODAY) return todayStr;
      if (title === Label.YESTERDAY) return yesterdayStr;
      return undefined;
    },
    [todayStr, yesterdayStr],
  );
  const emptyMessage = (() => {
    if (searchQuery) return `No behaviors matching "${searchQuery}".`;
    if (selectedCategoryId !== null) return 'No behaviors in this category.\nTap + to add one.';
    return 'No behaviors yet.\nAdd your first one.';
  })();
  const listEmptyComponent = useMemo(() => <Text style={styles.empty}>{emptyMessage}</Text>, [emptyMessage]);
  const contentContainerStyle = useMemo(
    () => [styles.listContent, behaviors.length === 0 && styles.emptyContainer],
    [behaviors.length],
  );
  const renderItem = useCallback(
    ({ item, section }: { item: BehaviorEntry; section: { title: string } }) => (
      <BehaviorCard
        behavior={item}
        showCategory={selectedCategoryId === null}
        dateStr={dateForSection(section.title)}
      />
    ),
    [dateForSection, selectedCategoryId],
  );
  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <SectionHeader
        title={section.title}
        behaviors={behaviors}
        tasks={tasks}
      />
    ),
    [behaviors, tasks],
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
});

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 140,
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
});
