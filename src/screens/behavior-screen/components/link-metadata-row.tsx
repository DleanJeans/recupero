import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { LinkPickerModal } from '../../../components/link-picker-modal';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { EMPTY_PERSON, usePeopleStore } from '../../../store/people-store';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import {
  getPickableTasks,
  LINK_TYPE_EMOJIS,
  LINK_TYPE_PLACEHOLDERS,
  type LinkFieldType,
  resolveLinkTarget,
} from '../../../utils/metadata-link-utils';
import { getLastContactTs, sortPeopleByContact } from '../../../utils/people-utils';
import { StackBehaviorPickerModal } from './stack-behavior-picker-modal';

interface LinkMetadataRowProps {
  field: MetadataField;
  type: LinkFieldType;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onFocus: () => void;
  /** Behavior the log is for, so it is not offered as its own link and the Behavior picker can rank suggestions. */
  behaviorId?: string;
  style?: StyleProp<ViewStyle>;
}

/** A task, behavior or person metadata field: shows the linked item and opens a search dialog to change it. */
export function LinkMetadataRow({ field, type, value, onChange, onFocus, behaviorId, style }: LinkMetadataRowProps) {
  const [picking, setPicking] = useState(false);
  const tasks = useBehaviorStore(state => state.tasks);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const people = usePeopleStore(state => state.people);
  const contacts = usePeopleStore(state => state.contacts);
  const addPerson = usePeopleStore(state => state.addPerson);

  const target = resolveLinkTarget(type, value, { tasks, behaviors, people });
  const hasValue = value !== '';

  const items = useMemo(() => {
    if (type === 'task') {
      return getPickableTasks(tasks).map(task => ({
        id: task.id,
        label: task.title,
        icon: task.icon,
        hint: task.completedDates.length > 0 ? 'Done' : undefined,
      }));
    }
    if (type === 'person') {
      return sortPeopleByContact(people, contacts)
        .reverse()
        .map(person => ({ id: person.id, label: person.name, icon: person.emoji }));
    }
    return [];
  }, [type, tasks, people, contacts]);

  const setValue = (id: string) => {
    onChange(prev => ({ ...prev, [field.key]: id }));
    setPicking(false);
  };
  const open = () => {
    onFocus();
    setPicking(true);
  };

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{field.label}</Text>
      <View style={styles.valueRow}>
        <Pressable
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${field.label}: ${target?.label ?? 'none'}`}
        >
          {hasValue ? (
            <AppIcon
              value={target?.icon ?? ''}
              size={20}
              fallback={LINK_TYPE_EMOJIS[type]}
            />
          ) : null}
          <Text
            style={[styles.pickerText, !hasValue && styles.placeholder]}
            numberOfLines={1}
          >
            {hasValue ? (target?.label ?? `Deleted ${type}`) : LINK_TYPE_PLACEHOLDERS[type]}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors.text.faint}
          />
        </Pressable>
        {hasValue ? (
          <Pressable
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
            onPress={() => onChange(prev => ({ ...prev, [field.key]: '' }))}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${field.label}`}
          >
            <Ionicons
              name="close"
              size={18}
              color={Colors.text.light}
            />
          </Pressable>
        ) : null}
      </View>
      {picking && type === 'behavior' ? (
        <StackBehaviorPickerModal
          visible
          behaviorId={behaviorId}
          excludeIds={behaviorId ? [behaviorId] : []}
          onClose={() => setPicking(false)}
          onPick={setValue}
        />
      ) : null}
      {picking && type !== 'behavior' ? (
        <LinkPickerModal
          placeholder={type === 'task' ? 'Search tasks' : 'Search people'}
          emptyText={type === 'task' ? 'No tasks found' : 'No people yet. Type a name to add one.'}
          items={items}
          fallbackIcon={LINK_TYPE_EMOJIS[type]}
          selectedId={hasValue ? value : undefined}
          onClose={() => setPicking(false)}
          onPick={setValue}
          onCreate={type === 'person' ? name => addPerson({ ...EMPTY_PERSON, name }) : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: Colors.bg.card, borderRadius: 12, padding: 12, gap: 6, marginBottom: 12 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  picker: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: { flex: 1, color: Colors.text.primary, fontSize: 16 },
  placeholder: { color: Colors.text.dim },
  clear: { padding: 6 },
  pressed: { opacity: 0.6 },
});
