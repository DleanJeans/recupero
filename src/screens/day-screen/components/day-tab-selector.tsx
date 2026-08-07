import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { DayTab } from '../../../store/screen-ui-store';
import { Colors } from '../../../utils/colors';

export type { DayTab } from '../../../store/screen-ui-store';

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
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: Colors.bg.card,
  },
  selectedTab: {
    backgroundColor: Colors.bg.elevated,
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
