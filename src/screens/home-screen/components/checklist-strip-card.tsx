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

export const CHECKLIST_CARD_HEIGHT = 112;

interface ChecklistStripCardProps {
  checklist: Checklist;
}

/** One checklist on the Routines strip: emoji, name, today's progress. Tap to run, long-press to edit. */
export function ChecklistStripCard({ checklist }: ChecklistStripCardProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, done, started, fraction } = useChecklistStatus(checklist);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, started && styles.startedCard, pressed && styles.pressed]}
      onPress={() => navigation.navigate('ChecklistRun', { checklistId: checklist.id })}
      onLongPress={() => navigation.navigate('ChecklistForm', { checklistId: checklist.id })}
      accessibilityRole="button"
      accessibilityLabel={`${checklist.name}, ${status}`}
      accessibilityHint="Opens the checklist. Long-press to edit."
    >
      <Text style={styles.emoji}>{checklist.emoji || CHECKLIST_DEFAULT_EMOJI}</Text>
      <Text
        style={styles.name}
        numberOfLines={1}
      >
        {checklist.name}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
      </View>
      <Text
        style={[styles.status, done && styles.doneStatus]}
        numberOfLines={1}
      >
        {status}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 128,
    height: CHECKLIST_CARD_HEIGHT,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  startedCard: {
    borderColor: '#3a5a3a',
  },
  pressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 18,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.type.desirable,
  },
  status: {
    color: Colors.text.muted,
    fontSize: 11,
    marginTop: 6,
  },
  doneStatus: {
    color: Colors.type.desirable,
  },
});
