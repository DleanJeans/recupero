import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../components/BehaviorIcon';
import { Button } from '../../components/Button';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { formatStopwatchDuration } from '../../utils/stopwatchUtils';
import { TaskComposer } from '../TaskScreen/components/task-composer';

export function TimerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const [behaviorQuery, setBehaviorQuery] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();
  const [lockedBehaviorId, setLockedBehaviorId] = useState<string | undefined>();
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>();
  const [stopTimestamp, setStopTimestamp] = useState<number | undefined>();
  const [nowTick, setNowTick] = useState(() => Date.now());

  const availableBehaviors = useMemo(() => {
    const timerBehaviors = behaviors.filter(
      behavior => behavior.xpEnabled === true && behavior.durationXpEnabled === true,
    );
    const visibleBehaviors = hidePrivate ? timerBehaviors.filter(behavior => !behavior.private) : timerBehaviors;
    return [...visibleBehaviors].sort((a, b) => a.name.localeCompare(b.name));
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

  const resetTimer = useCallback(() => {
    setStartTimestamp(undefined);
    setStopTimestamp(undefined);
    setNowTick(Date.now());
  }, []);

  const handleContinue = () => {
    if (!selectedBehaviorId) return;
    setLockedBehaviorId(selectedBehaviorId);
    resetTimer();
  };

  const handleBackToPicker = () => {
    setLockedBehaviorId(undefined);
    setSelectedBehaviorId(undefined);
    setBehaviorQuery('');
    resetTimer();
  };

  const handleStart = () => {
    const startedAt = Date.now();
    setStartTimestamp(startedAt);
    setStopTimestamp(undefined);
    setNowTick(startedAt);
  };

  const handleStop = () => {
    if (!lockedBehavior || startTimestamp == null) return;
    const stoppedAt = Date.now();
    setStopTimestamp(stoppedAt);
    setNowTick(stoppedAt);
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
            onBack={handleBackToPicker}
            onStart={handleStart}
            onStop={handleStop}
          />
        ) : (
          <>
            <View style={styles.header}>
              <ScreenTitle>Timer</ScreenTitle>
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

            {availableBehaviors.length === 0 && (
              <Button
                variant="secondary"
                onPress={() => navigation.navigate('BehaviorForm', {})}
              >
                + Add new behavior
              </Button>
            )}
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
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
}

function TimerPanel({ behavior, elapsedMs, isRunning, hasStarted, onBack, onStart, onStop }: TimerPanelProps) {
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
      </View>

      <View style={styles.lockedBehaviorCard}>
        <BehaviorIcon
          behavior={behavior}
          size={34}
        />
        <View style={styles.lockedBehaviorText}>
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
        <View style={styles.timerActions}>
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
            disabled={!isRunning}
            style={styles.timerActionButton}
          >
            Stop
          </Button>
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
    gap: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  timerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timerActionButton: {
    flex: 1,
  },
});
