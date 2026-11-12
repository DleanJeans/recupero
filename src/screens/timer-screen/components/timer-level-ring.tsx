import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatStopwatchDuration } from '../../../utils/stopwatch-utils';
import { formatTime } from '../../../utils/time-utils';
import { formatLevelEta, type TimerLevelProgress } from '../../../utils/timer-utils';

const RING_SIZE = 250;
const TICK_COUNT = 60;
const TICKS = Array.from({ length: TICK_COUNT }, (_, index) => index);
const EARLIER_COLOR = '#2f6f45';

interface TimerLevelRingProps {
  progress: TimerLevelProgress;
  elapsedMs: number;
  /** Start of the running (or stopped) segment. Undefined when ready or paused. */
  startTimestamp: number | undefined;
  paused: boolean;
  onRewindStart: () => void;
}

/** Ring of ticks for the behaviour's level: dim = XP from before this segment, bright = this segment, grey = to go. */
export function TimerLevelRing({ progress, elapsedMs, startTimestamp, paused, onRewindStart }: TimerLevelRingProps) {
  return (
    <View
      style={styles.ring}
      accessibilityLabel={`Level ${progress.level}, ${Math.floor(progress.xpInLevel)} of ${progress.xpForLevel} XP`}
    >
      {TICKS.map(index => {
        const position = (index + 0.5) / TICK_COUNT;
        const color =
          position <= progress.before
            ? EARLIER_COLOR
            : position <= progress.now
              ? Colors.type.desirable
              : Colors.bg.input;
        return (
          <View
            key={index}
            pointerEvents="none"
            style={[styles.tickArm, { transform: [{ rotate: `${(index / TICK_COUNT) * 360}deg` }] }]}
          >
            <View style={[styles.tick, { backgroundColor: color }]} />
          </View>
        );
      })}
      <View style={styles.center}>
        <Text style={styles.level}>Lv{progress.level}</Text>
        <Text style={[styles.time, paused && styles.timePaused]}>
          {paused ? 'Paused' : formatStopwatchDuration(elapsedMs)}
        </Text>
        <Text style={styles.eta}>
          Lv{progress.level + 1} in {formatLevelEta(progress.minutesToNext)}
        </Text>
        {startTimestamp != null && (
          <View style={styles.startedRow}>
            <Text style={styles.startedAt}>since {formatTime(startTimestamp)}</Text>
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

const styles = StyleSheet.create({
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickArm: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
  },
  tick: {
    width: 5,
    height: 16,
    borderRadius: 3,
  },
  center: {
    alignItems: 'center',
    gap: 4,
  },
  level: {
    color: Colors.text.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  time: {
    color: Colors.text.primary,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timePaused: {
    color: Colors.text.muted,
    fontSize: 36,
  },
  eta: {
    color: Colors.type.desirable,
    fontSize: 14,
    fontWeight: '700',
  },
  startedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  startedAt: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rewindButton: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rewindText: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
  },
});
