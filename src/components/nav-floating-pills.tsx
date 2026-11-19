import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from './bottom-nav';
import { RunningTimerPill } from './running-timer-pill';
import { UpdateReadyPill } from './update-ready-pill';

const GAP_ABOVE_NAV = 8;

/** Update/timer pills hovering a small gap above the bottom nav, with nothing behind them. Routines has its own (see home-screen). */
export function NavFloatingPills({ onTimerPress }: { onTimerPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { bottom: BOTTOM_NAV_HEIGHT + insets.bottom + GAP_ABOVE_NAV }]}
      pointerEvents="box-none"
    >
      <UpdateReadyPill />
      <RunningTimerPill onPress={onTimerPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, gap: 8 },
});
