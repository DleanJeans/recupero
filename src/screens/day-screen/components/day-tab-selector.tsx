import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

export type DayTab = 'logs' | 'metadata';

interface DayTabSelectorProps {
  selectedTab: DayTab;
  onSelect: (tab: DayTab) => void;
  counts?: Partial<Record<DayTab, number>>;
}

const TABS: { key: DayTab; label: string }[] = [
  { key: 'logs', label: 'Logs' },
  { key: 'metadata', label: 'Metadata' },
];

export function DayTabSelector({ selectedTab, onSelect, counts }: DayTabSelectorProps) {
  return (
    <View style={styles.tabs}>
      {TABS.map(tab => {
        const selected = tab.key === selectedTab;
        const count = counts?.[tab.key] ?? 0;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, selected && styles.selectedTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
          >
            <View style={styles.tabContent}>
              <Text style={[styles.tabText, selected && styles.selectedTabText]}>{tab.label}</Text>
              <Text
                style={[styles.tabCount, selected && styles.selectedTabCount]}
                accessibilityLabel={`${count} ${tab.label.toLowerCase()}`}
              >
                {count}
              </Text>
            </View>
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
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: {
    color: Colors.text.primary,
  },
  tabCount: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 10,
    textAlign: 'left',
  },
  selectedTabCount: {
    color: Colors.text.muted,
  },
});
