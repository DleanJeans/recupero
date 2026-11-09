import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import type { BehaviorEntry } from '../types/behavior';
import {
  getGroupKey,
  getGroupMemberLabel,
  getGroupMembers,
  getGroupTotals,
  normalizeGroupName,
} from '../utils/behavior-group-utils';
import { Colors } from '../utils/colors';
import { BehaviorIcon } from './behavior-icon';
import { Text } from './text';

interface Props {
  behavior: BehaviorEntry;
  onSelect: (behaviorId: string) => void;
}

/** Chips for the other members of a behaviour's group (e.g. Omachi flavours), with the group's totals.
 *  Renders nothing unless the group has at least two members. */
export function BehaviorGroupChips({ behavior, onSelect }: Props) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const groupEmoji = useBehaviorStore(state => state.groupEmojis?.[getGroupKey(behavior.group) ?? '']);
  const members = useMemo(() => getGroupMembers(behaviors, behavior), [behaviors, behavior]);
  const totals = useMemo(() => getGroupTotals(members), [members]);

  if (members.length < 2) return null;
  const groupName = normalizeGroupName(behavior.group) ?? '';
  const summary = [
    `${members.length} kinds`,
    `${totals.logCount} ${totals.logCount === 1 ? 'log' : 'logs'}`,
    ...(totals.xpEnabled ? [`${Math.round(totals.xp).toLocaleString()} XP total`] : []),
  ].join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={styles.groupName}
          numberOfLines={1}
        >
          {groupEmoji ? `${groupEmoji} ` : ''}
          {groupName}
        </Text>
        <Text
          style={styles.summary}
          numberOfLines={1}
        >
          {summary}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {members.map(member => {
          const active = member.id === behavior.id;
          return (
            <Pressable
              key={member.id}
              style={({ pressed }) => [styles.chip, active && styles.activeChip, pressed && styles.pressed]}
              onPress={() => {
                if (!active) onSelect(member.id);
              }}
              accessibilityRole="radio"
              accessibilityLabel={member.name}
              accessibilityState={{ selected: active }}
            >
              <BehaviorIcon
                behavior={member}
                size={18}
              />
              <Text
                style={[styles.label, active && styles.activeLabel]}
                numberOfLines={1}
              >
                {getGroupMemberLabel(member.name, groupName)}
              </Text>
              {member.logs.length > 0 && (
                <Text style={[styles.count, active && styles.activeCount]}>{member.logs.length}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 16,
  },
  groupName: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  summary: {
    color: Colors.text.faint,
    fontSize: 12,
    flexShrink: 1,
  },
  chips: {
    gap: 6,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeChip: {
    borderColor: Colors.text.primary,
    backgroundColor: Colors.bg.elevated,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 180,
  },
  activeLabel: {
    color: Colors.text.primary,
  },
  count: {
    color: Colors.text.dim,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  activeCount: {
    color: Colors.text.light,
  },
  pressed: {
    opacity: 0.7,
  },
});
