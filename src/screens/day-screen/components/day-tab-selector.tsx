import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

export type DayTab = 'metadata' | 'logs';

interface DayTabSelectorProps {
  selectedTab: DayTab;
  onSelect: (tab: DayTab) => void;
}

const TABS: { key: DayTab; label: string }[] = [
  { key: 'metadata', label: 'Metadata' },
  { key: 'logs', label: 'Logs' },
];

export function DayTabSelector({ selectedTab, onSelect }: DayTabSelectorProps) {
  return (
    <View style={styles.tabs}>
      {TABS.map(tab => {
        const selected = tab.key === selectedTab;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, selected && styles.selectedTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
          >
            <Text style={[styles.tabText, selected && styles.selectedTabText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 3,
    borderRadius: 12,
    backgroundColor: Colors.bg.input,
    gap: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: 9,
  },
  selectedTab: {
    backgroundColor: Colors.bg.card,
  },
  tabText: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: {
    color: Colors.text.primary,
  },
});
