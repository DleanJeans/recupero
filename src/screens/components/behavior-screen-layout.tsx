import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { BehaviorSummary } from '../../components/behavior-summary';
import { SafeAreaView } from '../../components/safe-area-view';
import type { BehaviorEntry } from '../../types/behavior';
import { Colors } from '../../utils/colors';

interface Props {
  behavior: BehaviorEntry;
  titleOverride?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  summaryXpMotionEnabled?: boolean;
  showCurrentHabitXpLabel?: boolean;
  summaryStarMotionEnabled?: boolean;
  /** Override back button press. When omitted, defaults to goBack(). */
  onBack?: () => void;
}

/** Shared layout for behavior detail/log screens.
 *  Renders a back button + BehaviorSummary header, a scalable children area,
 *  and an optional bottom action bar. */
export function BehaviorScreenLayout({
  behavior,
  titleOverride,
  children,
  actions,
  summaryXpMotionEnabled,
  showCurrentHabitXpLabel,
  summaryStarMotionEnabled,
  onBack,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <BehaviorSummary
          behavior={behavior}
          showCategory
          titleSize="header"
          titleOverride={titleOverride}
          xpMotionEnabled={summaryXpMotionEnabled}
          showCurrentHabitXpLabel={showCurrentHabitXpLabel}
          starMotionEnabled={summaryStarMotionEnabled}
        />
      </View>

      <View style={styles.body}>{children}</View>

      {actions}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
  },
});
