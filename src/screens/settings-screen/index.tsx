import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Colors } from '../../utils/colors';
import { DataTransferSection } from './components/data-transfer-section';
import { DayCutoffPicker } from './components/day-cutoff-picker';
import { PrivateBehaviorSection } from './components/private-behavior-section';
import { TimeFormatPicker } from './components/time-format-picker';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Settings</ScreenTitle>
      </View>

      <TimeFormatPicker />
      <DayCutoffPicker />
      <PrivateBehaviorSection />
      <DataTransferSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
});
