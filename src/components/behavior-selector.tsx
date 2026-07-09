import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { BehaviorIcon } from './behavior-icon';
import { Text, TextInput } from './text';

interface BehaviorSelectorProps {
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  query: string;
  showAllWhenEmpty?: boolean;
  emptyMessage?: string;
  onQueryChange: (query: string) => void;
  onSelect: (behaviorId: string | undefined) => void;
}

export function BehaviorSelector({
  behaviors,
  selectedBehaviorId,
  query,
  showAllWhenEmpty = false,
  emptyMessage = 'No behaviors available.',
  onQueryChange,
  onSelect,
}: BehaviorSelectorProps) {
  const filteredBehaviors = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return showAllWhenEmpty ? behaviors : [];
    return behaviors.filter(behavior => behavior.name.toLowerCase().includes(trimmed));
  }, [behaviors, query, showAllWhenEmpty]);
  const hasQuery = query.trim().length > 0;
  const selectedIsVisible = filteredBehaviors.some(behavior => behavior.id === selectedBehaviorId);

  useEffect(() => {
    if (selectedBehaviorId && !selectedIsVisible) {
      onSelect(undefined);
    }
  }, [onSelect, selectedBehaviorId, selectedIsVisible]);

  if (behaviors.length === 0) {
    return <Text style={styles.emptyInline}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.behaviorPicker}>
      <View style={styles.behaviorSearchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color={Colors.text.faint}
        />
        <TextInput
          style={styles.behaviorSearchInput}
          placeholder="Search behaviors"
          placeholderTextColor={Colors.text.faint}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              onQueryChange('');
              onSelect(undefined);
            }}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={17}
              color={Colors.text.faint}
            />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.behaviorList}
        contentContainerStyle={styles.behaviorListContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={filteredBehaviors.length > 4}
      >
        {!hasQuery && !showAllWhenEmpty ? null : filteredBehaviors.length === 0 ? (
          <Text style={styles.emptyInline}>No matching behaviors.</Text>
        ) : (
          filteredBehaviors.map(behavior => {
            const active = behavior.id === selectedBehaviorId;
            return (
              <Pressable
                key={behavior.id}
                style={({ pressed }) => [
                  styles.behaviorRow,
                  active && styles.behaviorRowActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelect(active ? undefined : behavior.id)}
              >
                <BehaviorIcon
                  behavior={behavior}
                  size={22}
                />
                <Text
                  style={[styles.behaviorRowText, active && styles.behaviorRowTextActive]}
                  numberOfLines={1}
                >
                  {behavior.name}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Colors.text.primary}
                  />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  behaviorPicker: {
    gap: 10,
  },
  behaviorSearchWrap: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  behaviorSearchInput: {
    flex: 1,
    height: 44,
    color: Colors.text.primary,
    fontSize: 15,
    paddingVertical: 0,
  },
  behaviorList: {
    maxHeight: 220,
  },
  behaviorListContent: {
    gap: 6,
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  behaviorRowActive: {
    borderColor: Colors.text.light,
    backgroundColor: Colors.bg.elevated,
  },
  behaviorRowText: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  behaviorRowTextActive: {
    color: Colors.text.primary,
  },
  emptyInline: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.72,
  },
});
