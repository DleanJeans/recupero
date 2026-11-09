import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NeedDayBands } from '../../../components/needs/charts/need-day-bands';
import { NeedLineChart } from '../../../components/needs/charts/need-line-chart';
import { Text } from '../../../components/text';
import type { NeedHistory } from '../../../hooks/use-need-history';
import { useSettingsStore } from '../../../store/settings-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import {
  countRefills,
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

interface NeedsLanesProps {
  histories: readonly NeedHistory[];
  range: NeedHistoryRange;
  from: number;
  to: number;
  dayStarts: readonly number[];
  onOpen: (needId: NeedId) => void;
}

/** One chart per need on a shared time axis; a day is a level line, a week or month is daily bands. */
export function NeedsLanes({ histories, range, from, to, dayStarts, onOpen }: NeedsLanesProps) {
  const hour12 = useSettingsStore(state => state.timeFormat === '12h');
  const dayEnd = dayStarts[dayStarts.length - 1];
  const xLabels = getAxisTicks(from, dayEnd, 6 * 3_600_000).map(x => ({ x, label: formatAxisHour(x, hour12) }));
  const dayLabels = getHistoryDayLabels(dayStarts, range);

  return (
    <View style={styles.list}>
      {histories.map((history, index) => {
        const info = NEED_INFO[history.id];
        const color = NEED_CHART_COLORS[history.id];
        const lowLine = history.config.cravingLine;
        const stats = getNeedRangeStats(history.points, lowLine, from, to);
        const refills = countRefills(history.events, from, to);
        const last = index === histories.length - 1;
        return (
          <Pressable
            key={history.id}
            style={({ pressed }) => [styles.lane, pressed && styles.pressed]}
            onPress={() => onOpen(history.id)}
            accessibilityRole="button"
            accessibilityLabel={`${info.label} history`}
          >
            <View style={styles.laneHeader}>
              <Text style={styles.emoji}>{info.emoji}</Text>
              <Text style={styles.name}>{info.label}</Text>
              <Text style={styles.stats}>
                {stats.avg == null
                  ? 'No data'
                  : `avg ${Math.round(stats.avg)}% · ${formatLowTime(stats.lowMs)} low · ${refills} refill${refills === 1 ? '' : 's'}`}
              </Text>
            </View>
            {range === 'day' ? (
              <NeedLineChart
                xMin={from}
                xMax={dayEnd}
                height={64}
                series={[{ key: history.id, color, points: history.points.map(p => ({ x: p.ts, y: p.level })) }]}
                guideY={lowLine}
                shade={getQuietWindows(from, dayEnd)}
                xLabels={last ? xLabels : undefined}
              />
            ) : (
              <NeedDayBands
                bands={getNeedDayBands(history.points, lowLine, dayStarts)}
                color={color}
                lowLine={lowLine}
                height={64}
                labels={last ? dayLabels : undefined}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  lane: {
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  laneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 15,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flex: 1,
    textAlign: 'right',
    color: Colors.text.faint,
    fontSize: 11,
  },
});
