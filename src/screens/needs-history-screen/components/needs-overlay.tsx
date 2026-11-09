import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { type ChartSeries, NeedLineChart } from '../../../components/needs/charts/need-line-chart';
import { Text } from '../../../components/text';
import type { NeedHistory } from '../../../hooks/use-need-history';
import { useSettingsStore } from '../../../store/settings-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import {
  formatAxisHour,
  formatLowTime,
  getAxisTicks,
  getHistoryDayLabels,
  getNeedDayBands,
  getNeedRangeStats,
  getQuietWindows,
  NEED_CHART_COLORS,
  type NeedHistoryRange,
} from '../../../utils/need-history-utils';
import { NEED_INFO } from '../../../utils/need-utils';
import { formatCompactDate, formatTime } from '../../../utils/time-utils';

interface NeedsOverlayProps {
  histories: readonly NeedHistory[];
  range: NeedHistoryRange;
  from: number;
  to: number;
  dayStarts: readonly number[];
}

/**
 * All needs on one chart, each in its own colour, with chips to hide lines. A day draws the levels;
 * a week or month draws each day's average.
 */
export function NeedsOverlay({ histories, range, from, to, dayStarts }: NeedsOverlayProps) {
  const [hidden, setHidden] = useState<ReadonlySet<NeedId>>(new Set());
  const hour12 = useSettingsStore(state => state.timeFormat === '12h');
  const dayEnd = dayStarts[dayStarts.length - 1];

  const perNeed = useMemo(
    () =>
      histories.map(history => {
        const lowLine = history.config.cravingLine;
        const stats = getNeedRangeStats(history.points, lowLine, from, to);
        const inRange = history.points.filter(point => point.ts >= from && point.ts <= to);
        const lowest = inRange.reduce<(typeof inRange)[number] | undefined>(
          (min, point) => (min == null || point.level < min.level ? point : min),
          undefined,
        );
        const bands = range === 'day' ? [] : getNeedDayBands(history.points, lowLine, dayStarts);
        return { history, stats, lowest, bands };
      }),
    [dayStarts, from, histories, range, to],
  );

  const series: ChartSeries[] = perNeed
    .filter(item => !hidden.has(item.history.id))
    .map(({ history, bands }) => ({
      key: history.id,
      color: NEED_CHART_COLORS[history.id],
      width: range === 'day' ? 2 : 2.5,
      points:
        range === 'day'
          ? history.points.map(point => ({ x: point.ts, y: point.level }))
          : bands
              .filter(band => band.avg != null)
              .map(band => ({ x: (band.start + band.end) / 2, y: band.avg as number })),
    }));
  const dots =
    range === 'day'
      ? []
      : series.flatMap(line =>
          line.points.map(point => ({ key: `${line.key}-${point.x}`, x: point.x, y: point.y, color: line.color })),
        );
  const lowLine = Math.min(...histories.map(history => history.config.cravingLine));
  const dayLabels = getHistoryDayLabels(dayStarts, range);

  const toggle = (id: NeedId) =>
    setHidden(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {histories.map(history => {
          const on = !hidden.has(history.id);
          const color = NEED_CHART_COLORS[history.id];
          return (
            <Pressable
              key={history.id}
              style={[styles.chip, on && { borderColor: color }]}
              onPress={() => toggle(history.id)}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
            >
              <Text style={[styles.chipText, on && { color }]}>
                {NEED_INFO[history.id].emoji} {NEED_INFO[history.id].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <NeedLineChart
          xMin={from}
          xMax={dayEnd}
          height={190}
          series={series}
          guideY={lowLine}
          dots={dots}
          shade={range === 'day' ? getQuietWindows(from, dayEnd) : undefined}
          xLabels={
            range === 'day'
              ? getAxisTicks(from, dayEnd, 6 * 3_600_000).map(x => ({ x, label: formatAxisHour(x, hour12) }))
              : undefined
          }
        />
        {range !== 'day' ? (
          <View style={styles.dayLabels}>
            {dayLabels.map((label, i) => (
              <Text
                key={`${dayStarts[i]}`}
                style={styles.dayLabel}
              >
                {label}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>{range === 'day' ? 'AVERAGE · LOWEST' : 'DAILY AVERAGE · LOWEST'}</Text>
      {perNeed.map(({ history, stats, lowest }) => (
        <View
          key={history.id}
          style={styles.row}
        >
          <View style={[styles.swatch, { backgroundColor: NEED_CHART_COLORS[history.id] }]} />
          <Text style={styles.rowName}>{NEED_INFO[history.id].label}</Text>
          <Text style={styles.rowDetail}>
            {stats.avg == null
              ? 'No data'
              : `avg ${Math.round(stats.avg)}% · lowest ${Math.round(lowest?.level ?? 0)}%${
                  lowest
                    ? ` ${range === 'day' ? formatTime(lowest.ts) : `${formatCompactDate(lowest.ts)} ${formatTime(lowest.ts)}`}`
                    : ''
                } · ${formatLowTime(stats.lowMs)} low`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 10,
  },
  dayLabels: {
    flexDirection: 'row',
    marginTop: 2,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text.faint,
    fontSize: 9,
  },
  sectionLabel: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowName: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    width: 64,
  },
  rowDetail: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 12,
  },
});
