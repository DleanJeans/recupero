import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { isTimerSessionActive, useTimerStore } from '../store/timer-store';
import { TimerPill } from './timer-pill';

interface RunningTimerPillProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One pill per timer (the open one first, the others stacked below), floating above the bottom nav while a timer
 * is running or waiting to be logged, since Timer has no tab. Tapping another timer's pill opens it.
 * On Routines it sits above the Add behavior button instead (see DockingPills).
 */
export function RunningTimerPill({ onPress, style }: RunningTimerPillProps) {
  const lockedBehaviorId = useTimerStore(s => s.lockedBehaviorId);
  const startTimestamp = useTimerStore(s => s.startTimestamp);
  const stopTimestamp = useTimerStore(s => s.stopTimestamp);
  const pendingLogBehaviorLogCount = useTimerStore(s => s.pendingLogBehaviorLogCount);
  const pausedAt = useTimerStore(s => s.pausedAt);
  const initialNotes = useTimerStore(s => s.initialNotes);
  const parked = useTimerStore(s => s.parked);
  const switchTo = useTimerStore(s => s.switchTo);
  const current =
    lockedBehaviorId != null && isTimerSessionActive({ startTimestamp, pausedAt })
      ? { lockedBehaviorId, startTimestamp, stopTimestamp, pendingLogBehaviorLogCount, pausedAt, initialNotes }
      : undefined;
  return (
    <>
      {current && (
        <TimerPill
          session={current}
          onPress={onPress}
          style={style}
        />
      )}
      {parked.map(session => (
        <TimerPill
          key={session.lockedBehaviorId}
          session={session}
          style={style}
          onPress={() => {
            switchTo(session.lockedBehaviorId);
            onPress();
          }}
        />
      ))}
    </>
  );
}
