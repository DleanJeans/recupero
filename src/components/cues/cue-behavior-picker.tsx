import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useActiveBehaviors } from '../../hooks/use-active-behaviors';
import { getGroupNames, isSameGroup } from '../../utils/behavior-group-utils';
import { Colors } from '../../utils/colors';
import { CUE_LIST_MAX_HEIGHT, CUE_LIST_SEARCH_MIN, filterBySearch } from '../../utils/cue-utils';
import { BehaviorIcon } from '../behavior-icon';
import { Text } from '../text';
import { CueSearchBox } from './cue-search-box';

interface CueBehaviorPickerProps {
  selectedIds: string[];
  multiple?: boolean;
  emptyMessage?: string;
  /** Group row support: when `onGroupChange` is set, groups (2+ members) are listed first and selectable whole. */
  selectedGroup?: string;
  onGroupChange?: (group: string | undefined) => void;
  onChange: (behaviorIds: string[]) => void;
}

export function CueBehaviorPicker({
  selectedIds,
  multiple = true,
  emptyMessage = 'Create a behaviour first.',
  selectedGroup,
  onGroupChange,
  onChange,
}: CueBehaviorPickerProps) {
  const behaviors = useActiveBehaviors();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterBySearch(behaviors, query, behavior => [behavior.name]), [behaviors, query]);

  const groups = useMemo(() => {
    if (!onGroupChange) return [];
    const needle = query.trim().toLowerCase();
    return getGroupNames(behaviors)
      .map(name => ({ name, count: behaviors.filter(behavior => isSameGroup(behavior.group, name)).length }))
      .filter(group => group.count >= 2 && (!needle || group.name.toLowerCase().includes(needle)));
  }, [behaviors, onGroupChange, query]);

  if (behaviors.length === 0) return <Text style={styles.empty}>{emptyMessage}</Text>;

  return (
    <View style={styles.container}>
      {behaviors.length >= CUE_LIST_SEARCH_MIN && (
        <CueSearchBox
          value={query}
          placeholder="Search behaviours"
          onChangeText={setQuery}
        />
      )}
      {visible.length === 0 && groups.length === 0 && (
        <Text style={styles.empty}>No behaviour matches “{query.trim()}”.</Text>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {groups.map(group => {
          const selected = isSameGroup(group.name, selectedGroup);
          return (
            <Pressable
              key={`group:${group.name}`}
              style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}
              onPress={() => onGroupChange?.(selected ? undefined : group.name)}
            >
              <Ionicons
                name="layers-outline"
                size={22}
                color={Colors.text.muted}
              />
              <Text
                style={[styles.name, selected && styles.selectedName]}
                numberOfLines={1}
              >
                {group.name}
              </Text>
              <Text
                style={styles.groupCount}
                numberOfLines={1}
              >
                {`All ${group.count}`}
              </Text>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={selected ? Colors.type.desirable : Colors.text.dim}
              />
            </Pressable>
          );
        })}
        {visible.map(behavior => {
          const selected = selectedIds.includes(behavior.id);
          return (
            <Pressable
              key={behavior.id}
              style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}
              onPress={() => {
                if (!multiple) {
                  onChange(selected ? [] : [behavior.id]);
                  return;
                }
                onChange(selected ? selectedIds.filter(id => id !== behavior.id) : [...selectedIds, behavior.id]);
              }}
            >
              <BehaviorIcon
                behavior={behavior}
                size={22}
              />
              <Text
                style={[styles.name, selected && styles.selectedName]}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={selected ? Colors.type.desirable : Colors.text.dim}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  scroll: { maxHeight: CUE_LIST_MAX_HEIGHT },
  list: { gap: 7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  selectedRow: { backgroundColor: Colors.bg.elevated, borderColor: Colors.type.desirable },
  name: { flex: 1, color: Colors.text.secondary, fontSize: 14, fontWeight: '600' },
  selectedName: { color: Colors.text.primary },
  groupCount: { flexShrink: 0, minWidth: 44, textAlign: 'right', color: Colors.text.faint, fontSize: 12 },
  empty: { color: Colors.text.faint, fontSize: 13, paddingVertical: 8 },
  pressed: { opacity: 0.72 },
});
