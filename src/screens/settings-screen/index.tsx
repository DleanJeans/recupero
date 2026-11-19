import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Colors } from '../../utils/colors';
import { AppLogMergeGap } from './components/app-log-merge-gap';
import { AppVersionSection } from './components/app-version-section';
import { CookBatchSection } from './components/cook-batch-section';
import { DataTransferSection } from './components/data-transfer-section';
import { DayCutoffPicker } from './components/day-cutoff-picker';
import { MoneyRewardsSection } from './components/money-rewards-section';
import { PatchNotesButton } from './components/patch-notes-button';
import { PrivateBehaviorSection } from './components/private-behavior-section';
import { ReminderToastSection } from './components/reminder-toast-section';
import { ShoppingTimerAppSection } from './components/shopping-timer-app-section';
import { TimeFormatPicker } from './components/time-format-picker';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Settings</ScreenTitle>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TimeFormatPicker />
        <DayCutoffPicker />
        <AppLogMergeGap />
        <MoneyRewardsSection />
        <ReminderToastSection />
        <CookBatchSection />
        <ShoppingTimerAppSection />
        <PrivateBehaviorSection />
        <DataTransferSection />
        <AppVersionSection />
        <PatchNotesButton />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  content: { paddingBottom: 32 },
});
