import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from '../../components/safe-area-view';
import type { BehaviorEntry } from '../../types/behavior';
import { Colors } from '../../utils/colors';
import { BehaviorHeader } from './behavior-header';

interface Props {
  behavior: BehaviorEntry;
  titleOverride?: string;
  children: React.ReactNode;
  summaryXpMotionEnabled?: boolean;
  showCurrentHabitXpLabel?: boolean;
  summaryStarMotionEnabled?: boolean;
  /** Override back button press. When omitted, defaults to goBack(). */
  onBack?: () => void;
}

/** Shared layout for behavior detail/log screens.
 *  Renders the BehaviorHeader (back button, title, stats card), a scalable children area,
 *  and an optional bottom action bar. */
export function BehaviorScreenLayout({
  behavior,
  titleOverride,
  children,
  summaryXpMotionEnabled,
  showCurrentHabitXpLabel,
  summaryStarMotionEnabled,
  onBack,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <BehaviorHeader
        behavior={behavior}
        titleOverride={titleOverride}
        xpMotionEnabled={summaryXpMotionEnabled}
        showCurrentHabitXpLabel={showCurrentHabitXpLabel}
        starMotionEnabled={summaryStarMotionEnabled}
        onBack={onBack}
      />

      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  body: {
    flex: 1,
  },
});
