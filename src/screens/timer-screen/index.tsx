import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../components/behavior-icon';
import { Button } from '../../components/button';
import { LogRewardPreview } from '../../components/log-reward-preview';
import { MoneyBalance } from '../../components/money-balance';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useSettingsStore } from '../../store/settings-store';
import { useTimerStore } from '../../store/timer-store';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../utils/money-utils';
import { formatStopwatchDuration } from '../../utils/stopwatch-utils';
import { formatTime } from '../../utils/time-utils';
import { getTimerXp } from '../../utils/xp-utils';
import { TaskComposer } from '../task-screen/components/task-composer';

export function TimerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const lockedBehaviorId = useTimerStore(state => state.lockedBehaviorId);
  const startTimestamp = useTimerStore(state => state.startTimestamp);
  const stopTimestamp = useTimerStore(state => state.stopTimestamp);
  const pendingLogBehaviorLogCount = useTimerStore(state => state.pendingLogBehaviorLogCount);
  const setLockedBehavior = useTimerStore(state => state.setLockedBehavior);
  const setStart = useTimerStore(state => state.setStart);
  const rewindStartMinute = useTimerStore(state => state.rewindStartMinute);
  const setStop = useTimerStore(state => state.setStop);
  const markLogPending = useTimerStore(state => state.markLogPending);
  const clearPendingLog = useTimerStore(state => state.clearPendingLog);
  const resumeTimer = useTimerStore(state => state.resume);
  const resetTimer = useTimerStore(state => state.reset);
  const [behaviorQuery, setBehaviorQuery] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [nowTick, setNowTick] = useState(() => Date.now());

  const availableBehaviors = useMemo(() => {
    const timerBehaviors = behaviors.filter(
      behavior => behavior.xpEnabled === true && behavior.durationXpEnabled === true,
    );
    const visibleBehaviors = hidePrivate ? timerBehaviors.filter(behavior => !behavior.private) : timerBehaviors;
    return [...visibleBehaviors].sort((a, b) => {
      const timestampDiff = (b.lastTimestamp ?? -Infinity) - (a.lastTimestamp ?? -Infinity);
      return timestampDiff || a.name.localeCompare(b.name);
    });
  }, [behaviors, hidePrivate]);
  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);
  const lockedBehavior = lockedBehaviorId ? behaviorById.get(lockedBehaviorId) : undefined;
  const isRunning = startTimestamp != null && stopTimestamp == null;
  const elapsedMs = startTimestamp == null ? 0 : Math.max(0, (stopTimestamp ?? nowTick) - startTimestamp);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // If the persisted timer references a behavior that no longer exists
  // (e.g. user deleted it while the app was closed), drop the stale state
  // so we render the picker instead of a dead session.
  useEffect(() => {
    if (lockedBehaviorId != null && behaviorById.get(lockedBehaviorId) == null) {
      resetTimer();
    }
  }, [behaviorById, lockedBehaviorId, resetTimer]);

  // When the screen regains focus after the user was on the log form, check
  // whether the pending session was actually saved by comparing the locked
  // behavior's current log count against the snapshot taken at Stop time.
  // If a log was added, the save succeeded and the timer should reset (back
  // to the picker, no Stop button). If not, the user just backed out — the
  // stopped timer stays so they can hit Relog/Log again.
  useFocusEffect(
    useCallback(() => {
      if (pendingLogBehaviorLogCount == null || lockedBehaviorId == null) return;
      const locked = useBehaviorStore.getState().behaviors.find(b => b.id === lockedBehaviorId);
      if (locked && locked.logs.length > pendingLogBehaviorLogCount) {
        resetTimer();
      } else {
        clearPendingLog();
      }
    }, [pendingLogBehaviorLogCount, lockedBehaviorId, resetTimer, clearPendingLog]),
  );

  const handleContinue = () => {
    if (!selectedBehaviorId) return;
    setLockedBehavior(selectedBehaviorId);
    setStart(Date.now());
    setNowTick(Date.now());
  };

  const handleBackToPicker = () => {
    resetTimer();
    setSelectedBehaviorId(undefined);
    setBehaviorQuery('');
  };

  const handleStart = () => {
    const startedAt = Date.now();
    setStart(startedAt);
    setNowTick(startedAt);
  };

  const handleResume = () => {
    resumeTimer();
    setNowTick(Date.now());
  };

  const handleRewindStart = () => {
    rewindStartMinute();
    setNowTick(Date.now());
  };

  const handleStop = () => {
    if (!lockedBehavior || startTimestamp == null) return;
    // If we already have a stop timestamp, the user is re-opening the log
    // form after coming back from it (an accidental back-out). Keep the
    // original end timestamp so the same session is logged.
    const stoppedAt = stopTimestamp ?? Date.now();
    if (stopTimestamp == null) {
      setStop(stoppedAt);
      setNowTick(stoppedAt);
      markLogPending(lockedBehavior.logs.length);
    }
    navigation.navigate('BehaviorLog', {
      behaviorId: lockedBehavior.id,
      initialMode: 'log',
      timerStartTimestamp: startTimestamp,
      timerEndTimestamp: stoppedAt,
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {lockedBehavior ? (
          <TimerPanel
            behavior={lockedBehavior}
            elapsedMs={elapsedMs}
            isRunning={isRunning}
            hasStarted={startTimestamp != null}
            hasStopped={stopTimestamp != null}
            startTimestamp={startTimestamp}
            dayCutoffHour={dayCutoffHour}
            onBack={handleBackToPicker}
            onStart={handleStart}
            onStop={handleStop}
            onResume={handleResume}
            onRewindStart={handleRewindStart}
          />
        ) : (
          <>
            <View style={styles.header}>
              <ScreenTitle>Timer</ScreenTitle>
              <MoneyBalance />
            </View>

            <TaskComposer
              title=""
              behaviorQuery={behaviorQuery}
              stars={0}
              behaviors={availableBehaviors}
              selectedBehaviorId={selectedBehaviorId}
              onTitleChange={() => {}}
              onBehaviorQueryChange={setBehaviorQuery}
              onStarsChange={() => {}}
              onBehaviorSelect={setSelectedBehaviorId}
              onAdd={handleContinue}
              onCancel={() => {
                setBehaviorQuery('');
                setSelectedBehaviorId(undefined);
              }}
              submitLabel="Continue"
              showTitleInput={false}
              showStarPicker={false}
              showCancelButton={false}
              showAllBehaviorsWhenSearchEmpty
              emptyBehaviorMessage={
                "No Timed behaviors available.\nTurn on Track XP and Track duration for XP\nin a behavior's settings to use it here."
              }
              showSubmitButton={availableBehaviors.length > 0}
              canSubmit={selectedBehaviorId != null}
            />

            <Button
              variant="secondary"
              onPress={() =>
                navigation.navigate('BehaviorForm', {
                  defaultXpEnabled: true,
                  defaultDurationXpEnabled: true,
                })
              }
            >
              + Add new timed behavior
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TimerPanelProps {
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

function TimerPanel({
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
}: TimerPanelProps) {
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(item => item.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
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
    <>
      <View style={styles.timerHeader}>
        <Button
          variant="icon"
          onPress={onBack}
          accessibilityLabel="Back to behavior picker"
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={Colors.text.primary}
          />
        </Button>
        <ScreenTitle>Timer</ScreenTitle>
        <MoneyBalance />
      </View>

      <View style={styles.lockedBehaviorCard}>
        <BehaviorIcon
          behavior={behavior}
          size={34}
        />
        <View style={styles.lockedBehaviorText}>
          {category && (
            <View style={styles.categoryRow}>
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
          )}
          <Text
            style={styles.lockedBehaviorName}
            numberOfLines={1}
          >
            {behavior.name}
          </Text>
          <Text style={styles.lockedBehaviorStatus}>{isRunning ? 'Running' : hasStarted ? 'Paused' : 'Ready'}</Text>
        </View>
      </View>

      <View style={styles.stopwatchPanel}>
        <Text style={styles.stopwatchValue}>{formatStopwatchDuration(elapsedMs)}</Text>
        {startTimestamp != null && (
          <Text style={styles.stopwatchCaption}>{`Started at ${formatTime(startTimestamp)}`}</Text>
        )}
        {startTimestamp != null && (
          <Button
            variant="secondary"
            onPress={onRewindStart}
            accessibilityLabel="Move start time back 1 minute"
            style={styles.rewindButton}
          >
            -1 min
          </Button>
        )}
        {(rewardXp != null || rewardMoney != null) && (
          <LogRewardPreview
            xp={rewardXp}
            money={rewardMoney}
            moneyOriginal={rewardMoneyOriginal}
            moneyMultiplier={rewardMoneyMultiplier}
            undesirable={behavior.type === 'undesirable'}
          />
        )}
        <View style={styles.timerActions}>
          {hasStopped ? (
            <>
              <Button
                variant="secondary"
                onPress={onStart}
                accessibilityLabel="Restart"
                style={styles.timerActionButton}
              >
                <Ionicons
                  name="refresh"
                  size={22}
                  color={Colors.text.light}
                />
              </Button>
              <Button
                variant="secondary"
                onPress={onResume}
                accessibilityLabel="Resume"
                style={styles.timerActionButton}
              >
                <Ionicons
                  name="play"
                  size={22}
                  color={Colors.text.light}
                />
              </Button>
              <Button
                variant="primary"
                onPress={onStop}
                style={styles.timerActionButton}
              >
                Log
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onPress={onStart}
                disabled={isRunning}
                style={styles.timerActionButton}
              >
                {hasStarted ? 'Restart' : 'Start'}
              </Button>
              <Button
                variant="primary"
                onPress={onStop}
                disabled={!hasStarted}
                style={styles.timerActionButton}
              >
                Stop
              </Button>
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -8,
  },
  lockedBehaviorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
  },
  lockedBehaviorText: {
    flex: 1,
    gap: 2,
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryName: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  lockedBehaviorName: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  lockedBehaviorStatus: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  stopwatchPanel: {
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 18,
    gap: 18,
  },
  stopwatchValue: {
    color: Colors.text.primary,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stopwatchCaption: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: -10,
  },
  rewindButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timerActionButton: {
    flex: 1,
  },
});
