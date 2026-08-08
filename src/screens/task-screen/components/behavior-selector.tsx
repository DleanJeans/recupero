import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text, TextInput } from '../../../components/text';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

interface BehaviorSelectorProps {
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  query: string;
  showAllWhenEmpty?: boolean;
  emptyMessage?: string;
  onQueryChange: (query: string) => void;
  onSelect: (behaviorId: string | undefined) => void;
  appearance?: 'default' | 'timer';
}

export function BehaviorSelector({
  behaviors,
  selectedBehaviorId,
  query,
  showAllWhenEmpty = false,
  emptyMessage = 'No behaviors available.',
  onQueryChange,
  onSelect,
  appearance = 'default',
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

  const isTimerAppearance = appearance === 'timer';

  if (behaviors.length === 0) {
    return <Text style={[styles.emptyInline, isTimerAppearance && styles.timerEmptyInline]}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.behaviorPicker}>
      <View style={[styles.behaviorSearchWrap, isTimerAppearance && styles.timerBehaviorSearchWrap]}>
        <Ionicons
          name="search-outline"
          size={17}
          color={Colors.text.faint}
        />
        <TextInput
          style={[styles.behaviorSearchInput, isTimerAppearance && styles.timerBehaviorSearchInput]}
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
        style={[styles.behaviorList, isTimerAppearance && styles.timerBehaviorList]}
        contentContainerStyle={[styles.behaviorListContent, isTimerAppearance && styles.timerBehaviorListContent]}
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
                  isTimerAppearance && styles.timerBehaviorRow,
                  active && (isTimerAppearance ? styles.timerBehaviorRowActive : styles.behaviorRowActive),
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelect(active ? undefined : behavior.id)}
              >
                <BehaviorIcon
                  behavior={behavior}
                  size={22}
                />
                <Text
                  style={[
                    styles.behaviorRowText,
                    isTimerAppearance && styles.timerBehaviorRowText,
                    active && styles.behaviorRowTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {behavior.name}
                </Text>
                {isTimerAppearance ? (
                  <TimerRadio active={active} />
                ) : (
                  active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={Colors.text.primary}
                    />
                  )
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function TimerRadio({ active }: { active: boolean }) {
  return (
    <View style={[styles.timerRadio, active && styles.timerRadioActive]}>
      {active && (
        <Ionicons
          name="checkmark"
          size={13}
          color={Colors.bg.primary}
        />
      )}
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
  timerBehaviorSearchWrap: {
    height: 52,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  behaviorSearchInput: {
    flex: 1,
    height: 44,
    color: Colors.text.primary,
    fontSize: 15,
    paddingVertical: 0,
  },
  timerBehaviorSearchInput: {
    height: 52,
    fontSize: 16,
  },
  behaviorList: {
    maxHeight: 220,
  },
  behaviorListContent: {
    gap: 6,
  },
  timerBehaviorList: {
    maxHeight: 360,
  },
  timerBehaviorListContent: {
    gap: 10,
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
  timerBehaviorRow: {
    gap: 13,
    backgroundColor: Colors.bg.card,
    borderColor: Colors.border.default,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  behaviorRowActive: {
    borderColor: Colors.text.light,
    backgroundColor: Colors.bg.elevated,
  },
  timerBehaviorRowActive: {
    borderColor: Colors.type.desirable,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
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
  timerBehaviorRowText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  timerRadio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: Colors.text.faint,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerRadioActive: {
    borderColor: Colors.type.desirable,
    backgroundColor: Colors.type.desirable,
  },
  emptyInline: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 8,
  },
  timerEmptyInline: {
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
