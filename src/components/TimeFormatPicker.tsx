import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TimeFormat } from '../store/settingsStore';
import { useSettingsStore } from '../store/settingsStore';
import { Text } from './Text';

function formatNow(hour12: boolean): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12 });
}

const FORMAT_OPTIONS: { value: TimeFormat; label: string; getDescription: () => string }[] = [
  { value: '12h', label: '12-hour', getDescription: () => formatNow(true) },
  { value: '24h', label: '24-hour', getDescription: () => formatNow(false) },
];

export function TimeFormatPicker() {
  const { timeFormat, setTimeFormat } = useSettingsStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const options = FORMAT_OPTIONS.map(o => ({ ...o, description: o.getDescription() }));

  return (
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
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionCard: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  optionCardSelected: { borderColor: '#EFEFEF', backgroundColor: '#2a2a2a' },
  optionLabel: { color: '#888', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  optionLabelSelected: { color: '#fff' },
  optionDescription: { color: '#555', fontSize: 24, fontWeight: '300' },
  optionDescriptionSelected: { color: '#ccc' },
});
