import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import type { TimeFormat } from '../store/settingsStore';
import { useSettingsStore } from '../store/settingsStore';

function formatNow(hour12: boolean): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

const FORMAT_OPTIONS: { value: TimeFormat; label: string; getDescription: () => string }[] = [
  { value: '12h', label: '12-hour', getDescription: () => formatNow(true) },
  { value: '24h', label: '24-hour', getDescription: () => formatNow(false) },
];

export function SettingsScreen() {
  const navigation = useNavigation();
  const { timeFormat, setTimeFormat } = useSettingsStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const options = FORMAT_OPTIONS.map(o => ({ ...o, description: o.getDescription() }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          onPress={navigation.goBack}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color="#fff"
          />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TIME FORMAT</Text>

        <View style={styles.optionsRow}>
          {options.map(option => {
            const isSelected = timeFormat === option.value;
            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  pressed && !isSelected && { opacity: 0.7 },
                ]}
                onPress={() => setTimeFormat(option.value)}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  optionCardSelected: {
    borderColor: '#EFEFEF',
    backgroundColor: '#2a2a2a',
  },
  optionLabel: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#fff',
  },
  optionDescription: {
    color: '#555',
    fontSize: 24,
    fontWeight: '300',
  },
  optionDescriptionSelected: {
    color: '#ccc',
  },
});
