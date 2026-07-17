import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { CueToggle } from '../../../components/cues/cue-toggle';
import { CueTriggerIcon } from '../../../components/cues/cue-trigger-icon';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useCuesStore } from '../../../store/cues-store';
import type { Cue } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { getCueAccent, getCueBehaviorLabel, getCueTriggerLabel, isAutoTimeTrigger } from '../../../utils/cue-utils';

interface CueCardProps {
  cue: Cue;
}

export function CueCard({ cue }: CueCardProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const places = useCuesStore(state => state.places);
  const toggleCue = useCuesStore(state => state.toggleCue);
  const firstBehavior = behaviors.find(behavior => behavior.id === cue.behaviorIds[0]);
  const accent = getCueAccent(cue.trigger.type);
  const triggerLabel = getCueTriggerLabel(cue.trigger, places, behaviors);
  const extraConditions = cue.conditions ?? [];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, !cue.enabled && styles.disabled, pressed && styles.pressed]}
      onPress={() => navigation.navigate('CueForm', { cueId: cue.id })}
    >
      <CueTriggerIcon type={cue.trigger.type} />
      <View style={styles.body}>
        <View style={styles.triggerRow}>
          <Text
            style={styles.trigger}
            numberOfLines={2}
          >
            {triggerLabel}
          </Text>
          {isAutoTimeTrigger(cue.trigger) && <Text style={styles.autoTag}>AUTO</Text>}
        </View>
        {extraConditions.map((condition, index) => (
          <View
            key={`${condition.type}-${index}`}
            style={styles.conditionRow}
          >
            <Text style={[styles.logicChip, { color: accent }]}>{cue.combiner ?? 'AND'}</Text>
            <Text
              style={styles.condition}
              numberOfLines={1}
            >
              {getCueTriggerLabel(condition, places, behaviors)}
            </Text>
          </View>
        ))}
        <View style={styles.flow}>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={accent}
          />
          {firstBehavior && (
            <BehaviorIcon
              behavior={firstBehavior}
              size={17}
            />
          )}
          <Text
            style={styles.behavior}
            numberOfLines={1}
          >
            {getCueBehaviorLabel(cue.behaviorIds, behaviors)}
          </Text>
        </View>
      </View>
      <View onStartShouldSetResponder={() => true}>
        <CueToggle
          value={cue.enabled}
          accent={accent}
          onValueChange={() => toggleCue(cue.id)}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  trigger: {
    flexShrink: 1,
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  autoTag: {
    color: Colors.star.filled,
    backgroundColor: `${Colors.star.filled}1f`,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '800',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logicChip: {
    backgroundColor: Colors.bg.input,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '800',
  },
  condition: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 11,
  },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  behavior: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
