import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useCuesStore } from '../../../store/cues-store';
import type { CueTrigger, CueTriggerType } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { createDefaultCueTrigger, getCueTriggerLabel, isCueTriggerComplete } from '../../../utils/cue-utils';
import { TriggerEditor } from './trigger-editor';
import { TriggerTypeGrid } from './trigger-type-grid';

interface AdditionalConditionsEditorProps {
  conditions: CueTrigger[];
  combiner: 'AND' | 'OR';
  onConditionsChange: (conditions: CueTrigger[]) => void;
  onCombinerChange: (combiner: 'AND' | 'OR') => void;
}

export function AdditionalConditionsEditor({
  conditions,
  combiner,
  onConditionsChange,
  onCombinerChange,
}: AdditionalConditionsEditorProps) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const places = useCuesStore(state => state.places);
  const [draft, setDraft] = useState<CueTrigger | null>(null);

  const startDraft = (type: CueTriggerType = 'time') => {
    setDraft(createDefaultCueTrigger(type, { placeId: places[0]?.id, behaviorId: behaviors[0]?.id }));
  };

  return (
    <View style={styles.container}>
      {conditions.map((condition, index) => (
        <View
          key={`${condition.type}-${index}`}
          style={styles.conditionRow}
        >
          <Pressable
            style={styles.combiner}
            onPress={() => onCombinerChange(combiner === 'AND' ? 'OR' : 'AND')}
          >
            <Text style={styles.combinerText}>{combiner}</Text>
          </Pressable>
          <Text
            style={styles.conditionLabel}
            numberOfLines={2}
          >
            {getCueTriggerLabel(condition, places, behaviors)}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => onConditionsChange(conditions.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={Colors.text.faint}
            />
          </Pressable>
        </View>
      ))}

      {draft ? (
        <View style={styles.draftCard}>
          <Text style={styles.draftTitle}>Extra condition</Text>
          <TriggerTypeGrid
            value={draft.type}
            onChange={type => startDraft(type)}
          />
          <TriggerEditor
            value={draft}
            onChange={setDraft}
          />
          <View style={styles.draftActions}>
            <Pressable onPress={() => setDraft(null)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.keep, !isCueTriggerComplete(draft) && styles.keepDisabled]}
              disabled={!isCueTriggerComplete(draft)}
              onPress={() => {
                onConditionsChange([...conditions, draft]);
                setDraft(null);
              }}
            >
              <Text style={styles.keepText}>Keep condition</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          onPress={() => startDraft()}
        >
          <Ionicons
            name="add"
            size={19}
            color={Colors.text.light}
          />
          <Text style={styles.addText}>Add condition</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 10,
  },
  combiner: { backgroundColor: Colors.bg.input, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  combinerText: { color: Colors.star.filled, fontSize: 10, fontWeight: '800' },
  conditionLabel: { flex: 1, color: Colors.text.secondary, fontSize: 13, lineHeight: 18 },
  draftCard: {
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  draftTitle: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  draftActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 18 },
  cancel: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  keep: { backgroundColor: Colors.text.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  keepDisabled: { opacity: 0.35 },
  keepText: { color: Colors.bg.black, fontSize: 13, fontWeight: '700' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  addText: { color: Colors.text.light, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
