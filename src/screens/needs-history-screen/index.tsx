import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { CueSegmentedControl } from '../../components/cues/cue-segmented-control';
import { NeedSheet } from '../../components/needs/need-sheet';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useNeedHistory } from '../../hooks/use-need-history';
import { type NeedHistoryDisplay, useNeedsStore } from '../../store/needs-store';
import { useSettingsStore } from '../../store/settings-store';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { getDayStartTimestamp, toDateString } from '../../utils/date-utils';
import {
  addLocalDays,
  getChartStepMs,
  getHistoryDayStarts,
  NEED_HISTORY_RANGE_DAYS,
  type NeedHistoryRange,
} from '../../utils/need-history-utils';
import { NEED_IDS } from '../../utils/need-utils';
import { formatCompactDate } from '../../utils/time-utils';
import { NeedsLanes } from './components/needs-lanes';
import { NeedsOverlay } from './components/needs-overlay';

const RANGES: ReadonlyArray<{ value: NeedHistoryRange; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const DISPLAYS: ReadonlyArray<{ value: NeedHistoryDisplay; label: string }> = [
  { value: 'lanes', label: 'One per need' },
  { value: 'overlay', label: 'All on one chart' },
];

/** History of all needs over a day, week or month: stacked charts or one combined chart. */
export function NeedsHistoryScreen() {
  const [range, setRange] = useState<NeedHistoryRange>('day');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<NeedId>();
  const display = useNeedsStore(state => state.historyDisplay);
  const setDisplay = useNeedsStore(state => state.setHistoryDisplay);
  const configs = useNeedsStore(state => state.needs);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);

  const { dayStarts, from, to } = useMemo(() => {
    const now = Date.now();
    const today = getDayStartTimestamp(toDateString(new Date(now), dayCutoffHour), dayCutoffHour);
    const starts = getHistoryDayStarts(today, NEED_HISTORY_RANGE_DAYS[range], offset, addLocalDays);
    return { dayStarts: starts, from: starts[0], to: Math.min(now, starts[starts.length - 1]) };
  }, [dayCutoffHour, offset, range]);
  const ids = useMemo(() => NEED_IDS.filter(id => configs[id].enabled), [configs]);
  const histories = useNeedHistory(ids, from, to, getChartStepMs(to - from));

  const periodLabel =
    range === 'day'
      ? offset === 0
        ? 'Today'
        : offset === 1
          ? 'Yesterday'
          : formatCompactDate(from)
      : `${formatCompactDate(from)} – ${formatCompactDate(dayStarts[dayStarts.length - 1] - 1)}`;

  const changeRange = (next: NeedHistoryRange) => {
    setRange(next);
    setOffset(0);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Needs history</ScreenTitle>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <CueSegmentedControl
          value={range}
          options={RANGES}
          onChange={changeRange}
        />
        <View style={styles.period}>
          <Pressable
            onPress={() => setOffset(value => value + 1)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Earlier"
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={Colors.text.light}
            />
          </Pressable>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <Pressable
            onPress={() => setOffset(value => Math.max(0, value - 1))}
            disabled={offset === 0}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Later"
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={offset === 0 ? Colors.text.dim : Colors.text.light}
            />
          </Pressable>
        </View>
        <CueSegmentedControl
          value={display}
          options={DISPLAYS}
          onChange={setDisplay}
        />

        {ids.length === 0 ? (
          <Text style={styles.empty}>All needs are turned off in Settings.</Text>
        ) : display === 'lanes' ? (
          <NeedsLanes
            histories={histories}
            range={range}
            from={from}
            to={to}
            dayStarts={dayStarts}
            onOpen={setOpenId}
          />
        ) : (
          <NeedsOverlay
            histories={histories}
            range={range}
            from={from}
            to={to}
            dayStarts={dayStarts}
          />
        )}
      </ScrollView>
      <NeedSheet
        needId={openId}
        onClose={() => setOpenId(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 40 },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  periodLabel: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    color: Colors.text.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
