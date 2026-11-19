import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { RunningTimerPill } from '../../../components/running-timer-pill';
import { UpdateReadyPill } from '../../../components/update-ready-pill';

interface DockingPillsProps {
  /** Height of the whole bottom bar this sits in; the FAB stack grows upward from its bottom padding. */
  barHeight: number;
  bottomPadding: number;
  /** While the FABs are collapsed (scrolling down) the pills slide down to rest right above the nav bar. */
  docked: boolean;
  onTimerPress: () => void;
}

/** Update + timer pills at the top of the Routines FAB stack. */
export function DockingPills({ barHeight, bottomPadding, docked, onTimerPress }: DockingPillsProps) {
  const [box, setBox] = useState({ y: 0, height: 0 });
  const progress = useRef(new Animated.Value(docked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: docked ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [docked, progress]);

  const distance = Math.max(0, barHeight - bottomPadding - (box.y + box.height));
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, distance] });
  // An empty wrapper would still add a flex gap in the bar, so cancel it until a pill shows.
  return (
    <Animated.View
      style={[styles.wrap, box.height === 0 && styles.empty, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
      onLayout={e => setBox({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })}
    >
      <UpdateReadyPill style={styles.pill} />
      <RunningTimerPill
        style={styles.pill}
        onPress={onTimerPress}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  empty: { marginBottom: -8 },
  // Full bar width: the pill itself caps at 86% (TimerPill), the same as on the other tabs.
  pill: { paddingTop: 0, backgroundColor: 'transparent', width: '100%' },
});
