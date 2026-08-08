import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MoneyBalance } from '../../components/money-balance';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { useBehaviorStore } from '../../store/behavior-store';
import { useSettingsStore } from '../../store/settings-store';
import { useTimerStore } from '../../store/timer-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { TimerPicker } from './components/timer-picker';
import { TimerRunningPanel } from './components/timer-running-panel';

export function TimerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const lockedBehaviorId = useTimerStore(state => state.lockedBehaviorId);
  const initialNotes = useTimerStore(state => state.initialNotes);
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
      initialNotes,
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
          <TimerRunningPanel
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

            <TimerPicker
              behaviors={availableBehaviors}
              behaviorQuery={behaviorQuery}
              selectedBehaviorId={selectedBehaviorId}
              onBehaviorQueryChange={setBehaviorQuery}
              onBehaviorSelect={setSelectedBehaviorId}
              onContinue={handleContinue}
              onAddNewTimedBehavior={() =>
                navigation.navigate('BehaviorForm', {
                  defaultXpEnabled: true,
                  defaultDurationXpEnabled: true,
                })
              }
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
});
