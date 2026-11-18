import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { confirmFinishBatch } from '../../../utils/finish-batch';
import { getBatchStatus } from '../../../utils/meal-batch-utils';
import { BatchLeftoverModal } from './batch-leftover-modal';

interface BatchFooterProps {
  behavior: BehaviorEntry;
}

/** Under a cooked batch's card: how much is left of the pot, with Edit and Finish. */
export function BatchFooter({ behavior }: BatchFooterProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categories = useBehaviorStore(state => state.categories);
  const [weighing, setWeighing] = useState(false);
  const status = getBatchStatus(behavior, categories);
  if (!status) return null;
  const unit = status.unit ? ` ${status.unit}` : '';
  const leftShare = status.cooked > 0 ? Math.min(1, status.left / status.cooked) : 0;
  return (
    <View style={styles.footer}>
      <View style={styles.text}>
        <Text style={styles.label}>{`Batch · ${status.left}${unit} left of ${status.cooked}${unit}`}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${leftShare * 100}%` }]} />
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setWeighing(true)}
        accessibilityRole="button"
        accessibilityLabel={`Weigh leftover of ${behavior.name}`}
      >
        <Text style={styles.buttonLabel}>Weigh</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => navigation.navigate('MealBatchForm', { behaviorId: behavior.id })}
        accessibilityRole="button"
        accessibilityLabel={`Edit batch ${behavior.name}`}
      >
        <Text style={styles.buttonLabel}>Edit</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => confirmFinishBatch(behavior)}
        accessibilityRole="button"
        accessibilityLabel={`Finish batch ${behavior.name}`}
      >
        <Text style={styles.buttonLabel}>Finish</Text>
      </Pressable>
      {weighing && (
        <BatchLeftoverModal
          behavior={behavior}
          onClose={() => setWeighing(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    paddingLeft: 20,
    paddingRight: 14,
    paddingBottom: 12,
  },
  text: { flex: 1, gap: 5 },
  label: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.bg.input, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#4ade80', borderRadius: 2 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.input,
  },
  pressed: { opacity: 0.7 },
  buttonLabel: { color: Colors.text.primary, fontSize: 12, fontWeight: '600' },
});
