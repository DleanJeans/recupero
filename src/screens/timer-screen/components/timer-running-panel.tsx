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
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry, Category } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { iconText } from '../../../utils/icon-utils';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { getTimerLevelProgress } from '../../../utils/timer-utils';
import { getEffectiveXp, getTimerXp } from '../../../utils/xp-utils';
import { TimerLevelRing } from './timer-level-ring';
import { TimerSessionList } from './timer-session-list';

interface TimerRunningPanelProps {
  behavior: BehaviorEntry;
  elapsedMs: number;
  isRunning: boolean;
  hasStarted: boolean;
  hasStopped: boolean;
  isPaused: boolean;
  startTimestamp: number | undefined;
  dayCutoffHour: number;
  onBack: () => void;
  onDiscard: () => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
  onRewindStart: () => void;
}

export function TimerRunningPanel({
  behavior,
  elapsedMs,
  isRunning,
  hasStarted,
  hasStopped,
  isPaused,
  startTimestamp,
  dayCutoffHour,
  onBack,
  onDiscard,
  onStart,
  onStop,
  onPause,
  onResume,
  onDone,
  onRewindStart,
}: TimerRunningPanelProps) {
  const category = useBehaviorStore(state =>
    behavior.categoryId ? state.categories.find(item => item.id === behavior.categoryId) : undefined,
  );
  const moneyRewardsEnabled = useSettingsStore(state => state.moneyRewardsEnabled);
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
    moneyRewardsEnabled && isRunning && rewardLog && behavior.moneyReward != null && behavior.type !== 'neutral'
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
  // Logged segments are already in the behaviour's XP; only the one on the clock is added on top.
  const levelProgress = getTimerLevelProgress(
    getEffectiveXp(behavior, Date.now(), dayCutoffHour),
    hasStarted ? getTimerXp(elapsedMs) : 0,
  );

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Button
          variant="icon"
          onPress={onBack}
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={Colors.text.primary}
          />
        </Button>
        <View
          pointerEvents="none"
          style={styles.headerTitleWrap}
        >
          <ScreenTitle style={styles.headerTitle}>Timer</ScreenTitle>
        </View>
        <MoneyBalance />
      </View>

      <TimerBehaviorChip
        behavior={behavior}
        category={category}
        status={isRunning ? 'Running' : isPaused ? 'Paused' : hasStopped ? 'Stopped' : 'Ready'}
      />

      <View style={styles.hero}>
        <TimerLevelRing
          progress={levelProgress}
          elapsedMs={elapsedMs}
          startTimestamp={startTimestamp}
          paused={isPaused}
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
          isPaused={isPaused}
          onStart={onStart}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
          onDone={onDone}
          onDiscard={onDiscard}
        />

        <TimerSessionList
          behavior={behavior}
          currentStart={startTimestamp}
          currentElapsedMs={elapsedMs}
          isRunning={isRunning}
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
            {iconText(category.emoji)} {category.name}
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

interface TimerActionsProps {
  hasStarted: boolean;
  hasStopped: boolean;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
  onDiscard: () => void;
}

function TimerActions({
  hasStarted,
  hasStopped,
  isRunning,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
  onDone,
  onDiscard,
}: TimerActionsProps) {
  if (isPaused) {
    // Every segment so far is already logged, so Done just closes the timer.
    return (
      <View style={styles.actions}>
        <View style={styles.secondaryActions}>
          <Button
            variant="secondary"
            onPress={onDone}
            style={styles.secondaryAction}
          >
            Done
          </Button>
          <Button
            variant="primary"
            onPress={onResume}
            style={styles.wideAction}
          >
            Resume
          </Button>
        </View>
      </View>
    );
  }

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
        <DiscardButton onPress={onDiscard} />
      </View>
    );
  }

  if (!hasStarted) {
    return (
      <View style={styles.actions}>
        <Button
          variant="primary"
          onPress={onStart}
          style={styles.primaryAction}
        >
          Start
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <View style={styles.secondaryActions}>
        <Button
          variant="secondary"
          onPress={onPause}
          disabled={!isRunning}
          style={styles.secondaryAction}
        >
          Pause
        </Button>
        <Button
          variant="primary"
          onPress={onStop}
          style={styles.wideAction}
        >
          Stop
        </Button>
      </View>
      <View style={styles.ghostActions}>
        <Button
          variant="ghost"
          onPress={onStart}
          accessibilityLabel="Restart timer"
        >
          <Text style={styles.restartText}>Restart</Text>
        </Button>
        <DiscardButton onPress={onDiscard} />
      </View>
    </View>
  );
}

/** Pure: red text button that discards the segment on the clock. */
function DiscardButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      variant="ghost"
      onPress={onPress}
      accessibilityLabel="Discard timer"
    >
      <Text style={styles.discardText}>Discard</Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  discardText: {
    color: Colors.type.undesirable,
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    flex: 1,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
    position: 'relative',
  },
  backButton: {
    marginLeft: -8,
  },
  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: 0,
  },
  headerTitleWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    alignItems: 'center',
    gap: 18,
    paddingTop: 4,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 11,
  },
  ghostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  restartText: {
    color: Colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  wideAction: {
    flex: 2,
    minHeight: 56,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 0,
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
