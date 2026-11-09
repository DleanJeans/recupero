import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text } from '../../../components/text';
import { useActiveBehaviors } from '../../../hooks/use-active-behaviors';
import { useCuesStore } from '../../../store/cues-store';
import type { BodySensationId } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { bodyCueRef, getBodySensationOption, getBodySuggestedBehaviorIds } from '../../../utils/cue-utils';
import { iconText } from '../../../utils/icon-utils';

interface BodySuggestionsProps {
  sensation: BodySensationId;
}

export function BodySuggestions({ sensation }: BodySuggestionsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cues = useCuesStore(state => state.cues);
  const customSensations = useCuesStore(state => state.customSensations);
  const behaviors = useActiveBehaviors();
  const suggestedIds = useMemo(() => getBodySuggestedBehaviorIds(sensation, cues), [cues, sensation]);
  const suggested = suggestedIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is NonNullable<typeof behavior> => behavior != null);
  const option = getBodySensationOption(sensation, customSensations);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        {iconText(option.emoji)} {option.label}. Recupero suggests
      </Text>
      {suggested.length === 0 ? (
        <Text style={styles.empty}>No reminders match this sensation yet.</Text>
      ) : (
        <View style={styles.chips}>
          {suggested.map(behavior => (
            <Pressable
              key={behavior.id}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() =>
                navigation.navigate('BehaviorLog', {
                  behaviorId: behavior.id,
                  initialMode: 'log',
                  initialCues: [bodyCueRef(sensation)],
                })
              }
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
    backgroundColor: `${Colors.cue.body}12`,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: `${Colors.cue.body}66`,
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
