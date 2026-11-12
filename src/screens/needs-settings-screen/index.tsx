import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Colors } from '../../utils/colors';
import { GoogleHealthSection } from './components/google-health-section';
import { NeedsSection } from './components/needs-section';

/** Needs settings, opened from the Needs panel on the Cues tab: each need's toggle, rate and fill source, plus Fitbit (fills Energy). */
export function NeedsSettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Needs settings</ScreenTitle>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <NeedsSection />
        <GoogleHealthSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  content: { paddingBottom: 32 },
});
