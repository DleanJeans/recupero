
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { DataTransferSection } from '../components/DataTransferSection';
import { Text } from '../components/Text';
import { TimeFormatPicker } from '../components/TimeFormatPicker';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <TimeFormatPicker />
      <DataTransferSection />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },

  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
