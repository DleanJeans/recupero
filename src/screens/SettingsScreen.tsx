
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { DataTransferSection } from '../components/DataTransferSection';
import { ScreenTitle } from '../components/ScreenTitle';
import { TimeFormatPicker } from '../components/TimeFormatPicker';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Settings</ScreenTitle>
      </View>

      <TimeFormatPicker />
      <DataTransferSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },

});
