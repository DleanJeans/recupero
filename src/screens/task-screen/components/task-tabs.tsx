import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { TaskTab } from '../../../store/screen-ui-store';
import { Colors } from '../../../utils/colors';

const TABS: Array<{ tab: TaskTab; label: string }> = [
  { tab: 'today', label: 'Today' },
  { tab: 'shopping', label: 'Shopping' },
  { tab: 'later', label: 'Later' },
];

interface TaskTabsProps {
  active: TaskTab;
  counts: Record<TaskTab, number>;
  onChange: (tab: TaskTab) => void;
}

/** Today · Shopping · Later pills with open-task counts. */
export function TaskTabs({ active, counts, onChange }: TaskTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map(({ tab, label }) => {
        const on = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, on && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text
              style={[styles.label, on && styles.labelOn]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {counts[tab] > 0 && (
              <View style={[styles.count, on && styles.countOn]}>
                <Text
                  style={[styles.countText, on && styles.countTextOn]}
                  numberOfLines={1}
                >
                  {counts[tab]}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabOn: {
    backgroundColor: Colors.text.primary,
  },
  label: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  labelOn: {
    color: Colors.bg.black,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: Colors.bg.elevated,
    alignItems: 'center',
  },
  countOn: {
    backgroundColor: Colors.bg.black,
  },
  countText: {
    color: Colors.text.lightest,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  countTextOn: {
    color: Colors.text.primary,
  },
});
