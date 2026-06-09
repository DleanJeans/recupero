import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataTransferSection } from '../components/DataTransferSection';
import { Text } from '../components/Text';
import { TimeFormatPicker } from '../components/TimeFormatPicker';

export function SettingsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]} onPress={navigation.goBack}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
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
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
