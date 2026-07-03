import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text } from '../../components/Text';
import { useDeferredComputation } from '../../hooks/useDeferredComputation';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  getAllDailyMetadataTotals,
  getBehaviorLogsForDate,
  getDailyMetadataContributions,
} from '../../utils/behaviorUtils';
import { getCalendarStarMetrics } from '../../utils/calendarMetrics';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/dateUtils';
import { getLogEndTimestamp } from '../../utils/logUtils';
import { getThresholds, getTotalStarsForDate } from '../../utils/starUtils';
import { getTaskStarsForDate } from '../../utils/taskUtils';
import { formatDuration } from '../../utils/timeUtils';
import { DateNavigationRow } from '../components/DateNavigationRow';
import { SummaryRow } from '../components/SummaryRow';
import { type DayTab, DayTabSelector } from './components/DayTabSelector';
import { LogList } from './components/LogList';
import { MetadataSummaryRow } from './components/MetadataSummaryRow';

export function DayScreen() {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const tasks = useBehaviorStore(s => s.tasks);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);

  const todayStr = toDateString(new Date(), dayCutoffHour);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTab, setSelectedTab] = useState<DayTab>('metadata');

  // Logs for the selected date
  const dayLogs = useMemo(() => {
    return getBehaviorLogsForDate(behaviors, selectedDate, dayCutoffHour);
  }, [behaviors, dayCutoffHour, selectedDate]);

  // Total entry count
  const totalEntries = dayLogs.length;

  // Metadata totals for the selected date
  const metadataTotals = useMemo(() => {
    return getAllDailyMetadataTotals(behaviors, categories, selectedDate, dayCutoffHour);
  }, [behaviors, categories, dayCutoffHour, selectedDate]);
  const metadataContributions = useMemo(() => {
    return getDailyMetadataContributions(dayLogs, categories);
  }, [categories, dayLogs]);

  // Earliest and latest log for duration calculation
  const daySpan = useMemo(() => {
    if (dayLogs.length === 0) return null;
    const minTs = Math.min(...dayLogs.map(entry => entry.log.timestamp));
    const maxTs = Math.max(...dayLogs.map(entry => getLogEndTimestamp(entry.log)));
    return { first: minTs, last: maxTs, spanMs: maxTs - minTs };
  }, [dayLogs]);

  // Star rating: total across opted-in behaviors and completed tasks for the selected date.
  // Summary item renders when either source contributed stars.
  const hasOptedInLog = useMemo(() => dayLogs.some(entry => getThresholds(entry.behavior) !== undefined), [dayLogs]);
  const taskStars = useMemo(() => getTaskStarsForDate(tasks, selectedDate), [tasks, selectedDate]);
  const calendarDayMetrics = useDeferredComputation(
    () => getCalendarStarMetrics(behaviors, tasks, dayCutoffHour),
    [behaviors, dayCutoffHour, tasks],
  );
  const totalStars = useMemo(() => {
    const behaviorStars = hasOptedInLog ? getTotalStarsForDate(behaviors, selectedDate, dayCutoffHour) : 0;
    return behaviorStars + taskStars;
  }, [behaviors, dayCutoffHour, selectedDate, hasOptedInLog, taskStars]);
  const hasStars = hasOptedInLog || taskStars > 0;
  const summaryItems = useMemo(
    () => [
      { label: 'entries', value: totalEntries },
      ...(hasStars
        ? [
            {
              label: 'stars',
              value: totalStars,
              icon: 'star' as const,
              accessibilityLabel: `${totalStars} stars on this date`,
            },
          ]
        : []),
      ...(dayLogs.length > 1 && daySpan ? [{ label: 'span', value: formatDuration(daySpan.spanMs) }] : []),
    ],
    [dayLogs.length, daySpan, hasStars, totalEntries, totalStars],
  );

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
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <ScreenTitle>Day</ScreenTitle>
      </View>

      <DateNavigationRow
        selectedDate={selectedDate}
        maxDate={todayStr}
        dayMetrics={calendarDayMetrics}
        dayMetricType="stars"
        nextDisabled={isToday}
        onSelect={setSelectedDate}
        onPrevious={goToPrevDay}
        onNext={goToNextDay}
      />

      <DayTabSelector
        selectedTab={selectedTab}
        onSelect={setSelectedTab}
      />

      {selectedTab === 'metadata' ? (
        <MetadataSummaryRow
          totals={metadataTotals}
          contributions={metadataContributions}
        />
      ) : (
        <>
          <SummaryRow items={summaryItems} />
          <LogList
            entries={dayLogs}
            selectedDate={selectedDate}
            categories={categories}
          />
        </>
      )}
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
});
