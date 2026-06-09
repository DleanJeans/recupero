import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { DataTransferSection } from '../components/DataTransferSection';
import { PrivateBehaviorSection } from '../components/PrivateBehaviorSection';
import { ScreenTitle } from '../components/ScreenTitle';
import { TimeFormatPicker } from '../components/TimeFormatPicker';
import { Colors } from '../utils/colors';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Settings</ScreenTitle>
      </View>

      <TimeFormatPicker />
      <PrivateBehaviorSection />
      <DataTransferSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
});
