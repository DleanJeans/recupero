import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { LogRewardPreview } from '../../../components/log-reward-preview';
import { MoneyBalance } from '../../../components/money-balance';
import { ScreenTitle } from '../../../components/screen-title';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry, Category } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { formatStopwatchDuration } from '../../../utils/stopwatch-utils';
import { formatTime } from '../../../utils/time-utils';
import { getTimerXp } from '../../../utils/xp-utils';

interface TimerRunningPanelProps {
  behavior: BehaviorEntry;
  elapsedMs: number;
  isRunning: boolean;
  hasStarted: boolean;
  hasStopped: boolean;
  startTimestamp: number | undefined;
  dayCutoffHour: number;
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
  onResume: () => void;
  onRewindStart: () => void;
}

export function TimerRunningPanel({
  behavior,
  elapsedMs,
  isRunning,
  hasStarted,
  hasStopped,
  startTimestamp,
  dayCutoffHour,
  onBack,
  onStart,
  onStop,
  onResume,
  onRewindStart,
}: TimerRunningPanelProps) {
  const category = useBehaviorStore(state =>
    behavior.categoryId ? state.categories.find(item => item.id === behavior.categoryId) : undefined,
  );
  const rewardLog =
    startTimestamp == null
      ? undefined
      : {
          id: 'timer-preview',
          timestamp: startTimestamp,
          endTimestamp: startTimestamp + elapsedMs,
        };
  const rewardXp = isRunning && behavior.xpEnabled ? getTimerXp(elapsedMs) : undefined;
  const rewardMoneyOriginal =
    isRunning && rewardLog && behavior.moneyReward != null && behavior.type !== 'neutral'
      ? getMoneyRewardForLog(rewardLog, behavior.moneyReward, true) * (behavior.type === 'undesirable' ? -1 : 1)
      : undefined;
  const rewardMoneyMultiplier =
    rewardLog == null || rewardMoneyOriginal == null
      ? undefined
      : getStarMoneyMultiplierForLog(behavior, rewardLog, dayCutoffHour);
  const rewardMoney =
    rewardMoneyOriginal == null || rewardMoneyMultiplier == null
      ? undefined
      : rewardMoneyOriginal * rewardMoneyMultiplier;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Button
          variant="icon"
          onPress={onBack}
          accessibilityLabel="Back to behavior picker"
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={Colors.text.primary}
          />
        </Button>
        <ScreenTitle style={styles.headerTitle}>Timer</ScreenTitle>
        <MoneyBalance />
      </View>

      <TimerBehaviorChip
        behavior={behavior}
        category={category}
        status={isRunning ? 'Running' : hasStarted ? 'Paused' : 'Ready'}
      />

      <View style={styles.hero}>
        <TimerRing
          elapsedMs={elapsedMs}
          startTimestamp={startTimestamp}
          onRewindStart={onRewindStart}
        />

        {(rewardXp != null || rewardMoney != null) && (
          <LogRewardPreview
            xp={rewardXp}
            money={rewardMoney}
            moneyOriginal={rewardMoneyOriginal}
            moneyMultiplier={rewardMoneyMultiplier}
            undesirable={behavior.type === 'undesirable'}
            variant="pill"
          />
        )}

        <TimerActions
          hasStarted={hasStarted}
          hasStopped={hasStopped}
          isRunning={isRunning}
          onStart={onStart}
          onStop={onStop}
          onResume={onResume}
        />
      </View>
    </View>
  );
}

interface TimerBehaviorChipProps {
  behavior: BehaviorEntry;
  category: Category | undefined;
  status: string;
}

function TimerBehaviorChip({ behavior, category, status }: TimerBehaviorChipProps) {
  return (
    <View style={styles.behaviorChip}>
      <BehaviorIcon
        behavior={behavior}
        size={24}
      />
      <View style={styles.behaviorChipText}>
        {category && (
          <Text style={styles.categoryLabel}>
            {category.emoji} {category.name}
          </Text>
        )}
        <View style={styles.behaviorNameRow}>
          <Text
            style={styles.behaviorName}
            numberOfLines={1}
          >
            {behavior.name}
          </Text>
          <Text style={styles.behaviorStatus}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

interface TimerRingProps {
  elapsedMs: number;
  startTimestamp: number | undefined;
  onRewindStart: () => void;
}

function TimerRing({ elapsedMs, startTimestamp, onRewindStart }: TimerRingProps) {
  return (
    <View style={styles.timerRing}>
      <View style={styles.timerRingHole}>
        <Text style={styles.timerValue}>{formatStopwatchDuration(elapsedMs)}</Text>
        {startTimestamp != null && (
          <View style={styles.startedRow}>
            <Text style={styles.startedAt}>{formatTime(startTimestamp)}</Text>
            <Button
              variant="secondary"
              onPress={onRewindStart}
              accessibilityLabel="Move start time back 1 minute"
              style={styles.rewindButton}
            >
              <Text style={styles.rewindText}>-1 min</Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

interface TimerActionsProps {
  hasStarted: boolean;
  hasStopped: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onResume: () => void;
}

function TimerActions({ hasStarted, hasStopped, isRunning, onStart, onStop, onResume }: TimerActionsProps) {
  if (hasStopped) {
    return (
      <View style={styles.actions}>
        <Button
          variant="primary"
          onPress={onStop}
          style={styles.primaryAction}
        >
          Log
        </Button>
        <View style={styles.secondaryActions}>
          <Button
            variant="secondary"
            onPress={onResume}
            style={styles.secondaryAction}
          >
            Resume
          </Button>
          <Button
            variant="secondary"
            onPress={onStart}
            style={styles.secondaryAction}
          >
            Restart
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <Button
        variant="primary"
        onPress={onStop}
        disabled={!hasStarted}
        style={styles.primaryAction}
      >
        Stop
      </Button>
      <Button
        variant="secondary"
        onPress={onStart}
        disabled={isRunning}
        style={styles.secondaryAction}
      >
        {hasStarted ? 'Restart' : 'Start'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backButton: {
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  behaviorChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  behaviorChipText: {
    flexShrink: 1,
    gap: 1,
  },
  categoryLabel: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '600',
  },
  behaviorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  behaviorName: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  behaviorStatus: {
    color: Colors.type.desirable,
    fontSize: 12,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 8,
  },
  timerRing: {
    width: 226,
    height: 226,
    borderRadius: 113,
    borderWidth: 8,
    borderColor: Colors.bg.input,
    borderTopColor: Colors.type.desirable,
    borderRightColor: Colors.type.desirable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRingHole: {
    width: 202,
    height: 202,
    borderRadius: 101,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerValue: {
    color: Colors.text.primary,
    fontSize: 52,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  startedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startedAt: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rewindButton: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rewindText: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 11,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 0,
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 11,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 54,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
