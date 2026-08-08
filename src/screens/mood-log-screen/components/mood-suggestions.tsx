import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useCuesStore } from '../../../store/cues-store';
import type { MoodId } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { getMoodOption, getMoodSuggestedBehaviorIds } from '../../../utils/cue-utils';

interface MoodSuggestionsProps {
  mood: MoodId;
}

export function MoodSuggestions({ mood }: MoodSuggestionsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cues = useCuesStore(state => state.cues);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const suggestedIds = useMemo(() => getMoodSuggestedBehaviorIds(mood, cues), [cues, mood]);
  const suggested = suggestedIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is NonNullable<typeof behavior> => behavior != null);
  const moodOption = getMoodOption(mood);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        Because you feel {moodOption.emoji} {moodOption.label}, Recupero suggests
      </Text>
      {suggested.length === 0 ? (
        <Text style={styles.empty}>No enabled cues match this mood yet.</Text>
      ) : (
        <View style={styles.chips}>
          {suggested.map(behavior => (
            <Pressable
              key={behavior.id}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => navigation.navigate('BehaviorLog', { behaviorId: behavior.id, initialMode: 'log' })}
              accessibilityRole="button"
              accessibilityLabel={`Log ${behavior.name}`}
              accessibilityHint="Double tap to open the behavior log."
            >
              <BehaviorIcon
                behavior={behavior}
                size={20}
              />
              <Text
                style={styles.chipText}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 11,
    backgroundColor: `${Colors.cue.mood}12`,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: `${Colors.cue.mood}66`,
    padding: 14,
  },
  heading: { color: Colors.text.secondary, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: { flexShrink: 1, color: Colors.text.primary, fontSize: 12, fontWeight: '700' },
  empty: { color: Colors.text.faint, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
