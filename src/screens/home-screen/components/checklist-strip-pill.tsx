import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useChecklistStatus } from '../../../hooks/use-checklist-status';
import type { Checklist } from '../../../types/checklist';
import type { RootStackParamList } from '../../../types/navigation';
import { CHECKLIST_DEFAULT_EMOJI } from '../../../utils/checklist-utils';
import { Colors } from '../../../utils/colors';

export const CHECKLIST_PILL_HEIGHT = 38;

interface ChecklistStripPillProps {
  checklist: Checklist;
}

/** Collapsed checklist on Routines: a slim pill filled by today's progress. A finished one folds to emoji and ✓. */
export function ChecklistStripPill({ checklist }: ChecklistStripPillProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, done, started, fraction, count } = useChecklistStatus(checklist);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        done && styles.donePill,
        started && styles.startedPill,
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('ChecklistRun', { checklistId: checklist.id })}
      onLongPress={() => navigation.navigate('ChecklistForm', { checklistId: checklist.id })}
      accessibilityRole="button"
      accessibilityLabel={`${checklist.name}, ${status}`}
      accessibilityHint="Opens the checklist. Long-press to edit."
    >
      {fraction > 0 && !done && (
        <View
          pointerEvents="none"
          style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]}
        />
      )}
      <Text style={styles.emoji}>{checklist.emoji || CHECKLIST_DEFAULT_EMOJI}</Text>
      {done ? (
        <Text style={styles.check}>✓</Text>
      ) : (
        <>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {checklist.name}
          </Text>
          {count ? <Text style={styles.count}>{count}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: CHECKLIST_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: CHECKLIST_PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    overflow: 'hidden',
  },
  donePill: {
    borderColor: '#2f5a3c',
  },
  startedPill: {
    borderColor: '#3a5a3a',
  },
  pressed: {
    opacity: 0.7,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1d3a26',
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 120,
  },
  count: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  check: {
    color: Colors.type.desirable,
    fontSize: 14,
    fontWeight: '800',
  },
});
