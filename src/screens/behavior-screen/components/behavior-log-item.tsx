import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LogRewardPreview } from '../../../components/log-reward-preview';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry, LogEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getLogDurationMs, getLogEndTimestamp, hasTimedLogRange } from '../../../utils/log-utils';
import { formatMetadataValueUnit } from '../../../utils/metadata-calculation-utils';
import { buildLogMetadataDisplay } from '../../../utils/metadata-list-display-utils';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { formatDuration, formatElapsedNumeric, formatTimeRange } from '../../../utils/time-utils';
import { getLogXp } from '../../../utils/xp-utils';

interface Props {
  behavior: BehaviorEntry;
  log: LogEntry;
  onEdit: () => void;
  metadataFields?: MetadataField[];
  elapsedTick: number;
  isDecayed?: boolean;
}

export const BehaviorLogItem = React.memo(function BehaviorLogItem({
  behavior,
  log,
  onEdit,
  metadataFields,
  elapsedTick,
  isDecayed = false,
}: Props) {
  const timeFormat = useSettingsStore(state => state.timeFormat);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const moneyRewardsEnabled = useSettingsStore(state => state.moneyRewardsEnabled);
  const timeText = useMemo(
    () => formatTimeRange(log.timestamp, log.endTimestamp, timeFormat === '12h'),
    [log.endTimestamp, log.timestamp, timeFormat],
  );
  const isRange = hasTimedLogRange(log);
  const elapsedText = useMemo(() => formatElapsedNumeric(getLogEndTimestamp(log)), [elapsedTick, log]);
  const durationText = useMemo(() => (isRange ? formatDuration(getLogDurationMs(log)) : undefined), [log, isRange]);
  const xp = behavior.xpEnabled ? getLogXp(log) : undefined;
  const moneyOriginal =
    moneyRewardsEnabled && behavior.moneyReward != null && behavior.type !== 'neutral'
      ? getMoneyRewardForLog(log, behavior.moneyReward, behavior.durationXpEnabled === true) *
        (behavior.type === 'undesirable' ? -1 : 1)
      : undefined;
  const moneyMultiplier =
    moneyOriginal == null ? undefined : getStarMoneyMultiplierForLog(behavior, log, dayCutoffHour);
  const money = moneyOriginal == null || moneyMultiplier == null ? undefined : moneyOriginal * moneyMultiplier;
  const metadataDisplay = useMemo(
    () => buildLogMetadataDisplay(metadataFields, log.metadata),
    [log.metadata, metadataFields],
  );
  const { big, bars, texts } = metadataDisplay;
  const notes = log.metadata?.notes ? String(log.metadata.notes) : undefined;
  const hasReward = xp != null || money != null;
  const hasSide = hasReward || big != null || texts.length > 0;

  const handlePress = useCallback(() => onEdit(), [onEdit]);

  return (
    <Pressable
      style={[styles.logItem, isDecayed && styles.decayedLogItem]}
      onPress={handlePress}
    >
      <View style={styles.topRow}>
        <View style={styles.timeContent}>
          <Text style={[styles.dateText, isDecayed && styles.decayedText]}>
            {timeText}
            {durationText ? (
              <Text style={[styles.timeText, isDecayed && styles.decayedText]}> ({durationText})</Text>
            ) : null}
          </Text>
          <Text style={[styles.elapsedText, isDecayed && styles.decayedText]}>{elapsedText}</Text>
        </View>
        {hasSide ? (
          <View style={styles.sideContent}>
            {hasReward ? (
              <LogRewardPreview
                xp={xp}
                money={money}
                moneyOriginal={moneyOriginal}
                moneyMultiplier={moneyMultiplier}
                undesirable={behavior.type === 'undesirable'}
                decayed={isDecayed}
              />
            ) : null}
            {big ? (
              <Text style={[styles.bigValue, isDecayed && styles.decayedText]}>
                {big.text}
                <Text style={styles.bigUnit}>{formatMetadataValueUnit(big.field)}</Text>
              </Text>
            ) : null}
            {texts.length > 0 ? (
              <Text style={styles.textLine}>
                {texts
                  .map(item =>
                    item.field.calculation === 'amount'
                      ? `${item.text}${formatMetadataValueUnit(item.field)}`
                      : `${item.field.label} ${item.text}${formatMetadataValueUnit(item.field)}`,
                  )
                  .join('  ·  ')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {bars.length > 0 ? (
        <View style={styles.barSection}>
          <View style={styles.bar}>
            {bars.map((item, i) => (
              <View
                key={item.field.key}
                style={[
                  styles.barSegment,
                  { flex: item.amount, backgroundColor: Colors.metadataBar[i % Colors.metadataBar.length] },
                ]}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {bars.map((item, i) => (
              <View
                key={item.field.key}
                style={styles.legendItem}
              >
                <View
                  style={[styles.legendDot, { backgroundColor: Colors.metadataBar[i % Colors.metadataBar.length] }]}
                />
                <Text style={styles.legendText}>
                  {item.field.label} <Text style={styles.legendValue}>{item.text}</Text>
                  {formatMetadataValueUnit(item.field)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {notes ? (
        <Text
          style={styles.notesText}
          numberOfLines={2}
        >
          {notes}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  logItem: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    overflow: 'hidden',
  },
  decayedLogItem: {
    backgroundColor: Colors.status.error,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeContent: {
    flexShrink: 1,
  },
  sideContent: {
    flexShrink: 1,
    maxWidth: '60%',
    alignItems: 'flex-end',
    gap: 2,
  },
  bigValue: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bigUnit: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  textLine: {
    color: Colors.text.light,
    fontSize: 13,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  barSection: {
    gap: 7,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    gap: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    color: Colors.text.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  legendValue: {
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  notesText: {
    color: Colors.text.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  dateText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeText: {
    color: Colors.text.primary,
    fontSize: 14,
  },
  elapsedText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  decayedText: {
    color: Colors.status.dangerLight,
  },
});
