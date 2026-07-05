import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskEntry } from '../../../types/task';
import { groupBehaviorsByRecency } from '../../../utils/behavior-utils';
import { Colors } from '../../../utils/colors';
import { COOLDOWN_FILTER_LABEL, isCooldownCategoryFilterId } from '../../../utils/cooldown-filter';
import { toDateString, yesterday } from '../../../utils/date-utils';
import { Label } from '../../../utils/strings';
import { BehaviorCard } from './behavior-card';
import { SectionHeader } from './section-header';

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
  tasks: TaskEntry[];
  selectedCategoryId: string | null;
  searchQuery?: string;
  motionEnabled?: boolean;
}

export const BehaviorList = React.memo(function BehaviorList({
  behaviors,
  tasks,
  selectedCategoryId,
  searchQuery,
  motionEnabled = true,
}: BehaviorListProps) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const [now, setNow] = useState(() => Date.now());
  const cooldownSelected = isCooldownCategoryFilterId(selectedCategoryId);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sections = useMemo(
    () =>
      cooldownSelected
        ? behaviors.length > 0
          ? [{ title: COOLDOWN_FILTER_LABEL, data: behaviors }]
          : []
        : groupBehaviorsByRecency(behaviors, dayCutoffHour),
    [behaviors, cooldownSelected, dayCutoffHour],
  );
  const todayStr = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour]);
  const yesterdayStr = useMemo(() => toDateString(yesterday(new Date(), dayCutoffHour)), [dayCutoffHour]);
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
    if (cooldownSelected) return 'No cooldown behaviors yet.\nLog a cooldown-enabled behavior to see it here.';
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
        showCategory={selectedCategoryId === null || cooldownSelected}
        dateStr={dateForSection(section.title)}
        motionEnabled={motionEnabled}
        now={now}
      />
    ),
    [cooldownSelected, dateForSection, motionEnabled, now, selectedCategoryId],
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
