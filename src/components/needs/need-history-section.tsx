import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNeedHistory } from '../../hooks/use-need-history';
import { useBehaviorStore } from '../../store/behavior-store';
import { useNeedsStore } from '../../store/needs-store';
import { useSettingsStore } from '../../store/settings-store';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { getDayStartTimestamp, toDateString } from '../../utils/date-utils';
import {
  addLocalDays,
  describeNeedEvent,
  formatAxisHour,
  formatLowTime,
  getAxisTicks,
  getChartStepMs,
  getNeedDayBands,
  getNeedRangeStats,
  getQuietWindows,
  MS_PER_DAY,
  NEED_CHART_COLORS,
} from '../../utils/need-history-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';
import { NeedDayBands, NeedLowBars } from './charts/need-day-bands';
import { NeedLineChart } from './charts/need-line-chart';

type Range = '24h' | '3d' | '7d';
const RANGES: Range[] = ['24h', '3d', '7d'];
const RANGE_MS: Record<Range, number> = { '24h': MS_PER_DAY, '3d': 3 * MS_PER_DAY, '7d': 7 * MS_PER_DAY };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface NeedHistorySectionProps {
  needId: NeedId;
  onEditLog: (behaviorId: string, logId: string) => void;
}

/** Level chart at the top of a need's sheet: 24h and 3d as a line with refill dots, 7d as daily bands. */
export function NeedHistorySection({ needId, onEditLog }: NeedHistorySectionProps) {
  const [range, setRange] = useState<Range>('24h');
  const [selectedKey, setSelectedKey] = useState<string>();
  const hour12 = useSettingsStore(state => state.timeFormat === '12h');
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const checkIns = useNeedsStore(state => state.checkIns);

  // Fixed per range so the chart doesn't recompute every render, but moved on to now whenever a check-in
  // or top-up is saved so it shows at once.
  const { from, to, dayStarts } = useMemo(() => {
    const now = Date.now();
    if (range !== '7d') return { from: now - RANGE_MS[range], to: now, dayStarts: [] as number[] };
    const today = getDayStartTimestamp(toDateString(new Date(now), dayCutoffHour), dayCutoffHour);
    const starts = Array.from({ length: 8 }, (_, i) => addLocalDays(today, i - 6));
    return { from: starts[0], to: now, dayStarts: starts };
  }, [range, dayCutoffHour, checkIns]);
  const ids = useMemo(() => [needId], [needId]);
  const [history] = useNeedHistory(ids, from, to, getChartStepMs(to - from));
  const color = NEED_CHART_COLORS[needId];
  const lowLine = history.config.cravingLine;

  const dots = useMemo(
    () =>
      history.events.map(event => {
        const before = history.points.find(point => point.ts === event.ts);
        const after = [...history.points].reverse().find(point => point.ts === event.ts);
        const isCheckIn = event.kind === 'set' && event.checkIn === true;
        return {
          key: `${event.ts}-${event.logId ?? ''}`,
          x: event.ts,
          y: (after ?? before)?.level ?? 0,
          color: isCheckIn ? '#60a5fa' : Colors.type.desirable,
          event,
        };
      }),
    [history],
  );
  const selected = dots.find(dot => dot.key === selectedKey);
  const selectedBehavior = selected?.event.behaviorId
    ? behaviors.find(behavior => behavior.id === selected.event.behaviorId)
    : undefined;

  const xLabels = useMemo(() => {
    if (range === '24h')
      return getAxisTicks(from, to, 6 * 3_600_000).map(x => ({ x, label: formatAxisHour(x, hour12) }));
    return getAxisTicks(from, to, MS_PER_DAY).map(x => ({ x, label: WEEKDAYS[new Date(x).getDay()] }));
  }, [from, to, range, hour12]);

  const bands = useMemo(
    () => (range === '7d' ? getNeedDayBands(history.points, lowLine, dayStarts) : []),
    [dayStarts, history.points, lowLine, range],
  );
  const stats = useMemo(
    () => getNeedRangeStats(history.points, lowLine, from, to),
    [from, history.points, lowLine, to],
  );
  const dayLabels = bands.map(band => WEEKDAYS[new Date(band.start).getDay()].slice(0, 1));
  const knownDays = Math.max(1, stats.knownMs / MS_PER_DAY);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {RANGES.map(item => (
          <Pressable
            key={item}
            style={[styles.tab, item === range && styles.tabActive]}
            onPress={() => {
              setRange(item);
              setSelectedKey(undefined);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: item === range }}
          >
            <Text style={[styles.tabText, item === range && styles.tabTextActive]}>{item}</Text>
          </Pressable>
        ))}
        {stats.avg != null ? (
          <Text style={styles.summary}>
            avg {Math.round(stats.avg)}% · {formatLowTime(stats.lowMs / (range === '7d' ? knownDays : 1))} low
            {range === '7d' ? '/day' : ''}
          </Text>
        ) : null}
      </View>

      {history.points.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No refills or check-ins in this range yet.</Text>
        </View>
      ) : range === '7d' ? (
        <>
          <NeedDayBands
            bands={bands}
            color={color}
            lowLine={lowLine}
            height={110}
            labels={dayLabels}
          />
          <Text style={styles.caption}>Time below {lowLine}%</Text>
          <NeedLowBars
            bands={bands}
            height={36}
          />
        </>
      ) : (
        <NeedLineChart
          xMin={from}
          xMax={to}
          height={120}
          series={[{ key: needId, color, points: history.points.map(point => ({ x: point.ts, y: point.level })) }]}
          guideY={lowLine}
          dots={dots.map(dot => ({ ...dot, selected: dot.key === selectedKey }))}
          onDotPress={key => setSelectedKey(current => (current === key ? undefined : key))}
          shade={getQuietWindows(from, to)}
          xLabels={xLabels}
        />
      )}

      {selected && range !== '7d' ? (
        <Pressable
          style={({ pressed }) => [styles.selected, pressed && selectedBehavior && styles.pressed]}
          onPress={
            selectedBehavior && selected.event.logId
              ? () => onEditLog(selectedBehavior.id, selected.event.logId as string)
              : undefined
          }
          disabled={!selectedBehavior}
          accessibilityRole={selectedBehavior ? 'button' : undefined}
        >
          <Text
            style={styles.selectedName}
            numberOfLines={1}
          >
            {selectedBehavior?.name ?? (selected.event.kind === 'add' ? 'Updated without a log' : 'You checked in')}
          </Text>
          <Text style={[styles.selectedAmount, { color: selected.color }]}>{describeNeedEvent(selected.event)}</Text>
          <Text style={styles.selectedTime}>{formatTime(selected.event.ts)}</Text>
          {selectedBehavior ? (
            <Ionicons
              name="create-outline"
              size={16}
              color={Colors.text.light}
            />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.bg.input,
  },
  tabActive: {
    backgroundColor: Colors.bg.elevated,
  },
  tabText: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  tabTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  summary: {
    flex: 1,
    textAlign: 'right',
    color: Colors.text.faint,
    fontSize: 11,
  },
  empty: {
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.bg.darker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  caption: {
    color: Colors.text.faint,
    fontSize: 11,
    marginTop: 4,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedName: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: 13,
  },
  selectedAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedTime: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
