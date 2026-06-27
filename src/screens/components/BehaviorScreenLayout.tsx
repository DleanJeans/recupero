import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { BehaviorSummary } from '../../components/BehaviorSummary';
import { fabStyles } from '../../components/Button';
import type { BehaviorEntry } from '../../types/behavior';
import { Colors } from '../../utils/colors';

interface Props {
  behavior: BehaviorEntry;
  titleOverride?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Override back button press. When omitted, defaults to goBack(). */
  onBack?: () => void;
}

/** Shared layout for behavior detail/log screens.
 *  Renders a back button + BehaviorSummary header, a scalable children area,
 *  and an optional bottom action bar. */
export function BehaviorScreenLayout({ behavior, titleOverride, children, actions, onBack }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <BehaviorSummary
          behavior={behavior}
          showCategory
          titleSize="header"
          titleOverride={titleOverride}
        />
      </View>

      <View style={styles.body}>{children}</View>

      {actions && <View style={[fabStyles.fab, { paddingVertical: 0 }]}>{actions}</View>}
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
