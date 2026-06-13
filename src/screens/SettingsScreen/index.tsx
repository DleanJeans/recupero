import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Colors } from '../../utils/colors';
import { DataTransferSection } from './components/DataTransferSection';
import { PrivateBehaviorSection } from './components/PrivateBehaviorSection';
import { TimeFormatPicker } from './components/TimeFormatPicker';

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
