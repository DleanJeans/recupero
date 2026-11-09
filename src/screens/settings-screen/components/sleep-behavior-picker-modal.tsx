import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useHealthStore } from '../../../store/health-store';
import { Colors } from '../../../utils/colors';
import { filterBehaviorsByName, getSleepBehaviorChoices } from '../../../utils/google-health-utils';

interface SleepBehaviorPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Picks the behaviour that synced sleep is logged to, creates a "Sleep" behaviour, or turns sleep sync off. */
export function SleepBehaviorPickerModal({ visible, onClose }: SleepBehaviorPickerModalProps) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const addBehavior = useBehaviorStore(state => state.addBehavior);
  const sleepBehaviorId = useHealthStore(state => state.sleepBehaviorId);
  const setSleepBehavior = useHealthStore(state => state.setSleepBehavior);
  const [query, setQuery] = useState('');
  if (!visible) return null;
  const searching = query.trim().length > 0;
  const choices = filterBehaviorsByName(getSleepBehaviorChoices(behaviors), query);

  const close = () => {
    setQuery('');
    onClose();
  };

  const choose = (behaviorId: string | undefined) => {
    setSleepBehavior(behaviorId);
    close();
  };

  const createSleep = () => {
    addBehavior('Sleep', 'desirable', '😴');
    const created = useBehaviorStore.getState().behaviors.at(-1);
    if (created) choose(created.id);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Log Fitbit sleep to</Text>
          <TextInput
            style={styles.search}
            placeholder="Search behaviours"
            placeholderTextColor={Colors.text.faint}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {!searching && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
                  onPress={() => choose(undefined)}
                >
                  <Text style={[styles.choiceText, !sleepBehaviorId && styles.choiceSelected]}>Don’t sync sleep</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
                  onPress={createSleep}
                >
                  <Text style={styles.choiceText}>＋ New “Sleep” behaviour</Text>
                </Pressable>
              </>
            )}
            {choices.map(behavior => (
              <Pressable
                key={behavior.id}
                style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
                onPress={() => choose(behavior.id)}
              >
                <Text style={[styles.choiceText, sleepBehaviorId === behavior.id && styles.choiceSelected]}>
                  {typeof behavior.icon === 'string' ? `${behavior.icon} ` : ''}
                  {behavior.name}
                </Text>
              </Pressable>
            ))}
            {searching && choices.length === 0 && <Text style={styles.empty}>No behaviours match.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { maxHeight: '70%', backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  sheetTitle: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  search: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  empty: { color: Colors.text.faint, fontSize: 14, paddingVertical: 12 },
  choice: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  choiceText: { color: Colors.text.secondary, fontSize: 14 },
  choiceSelected: { color: Colors.type.desirable, fontWeight: '700' },
});
