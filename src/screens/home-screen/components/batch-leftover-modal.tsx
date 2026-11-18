import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getBatchStatus, getLeftoverAdjustment } from '../../../utils/meal-batch-utils';
import { parseDecimalInput } from '../../../utils/metadata-calculation-utils';
import { roundTo2 } from '../../../utils/number-utils';

interface BatchLeftoverModalProps {
  behavior: BehaviorEntry;
  onClose: () => void;
}

/** Weigh what is left of the pot: the cooked weight becomes eaten + leftover (evaporated water drops out) and the
 *  rates, including those of portions already logged, are recalculated. */
export function BatchLeftoverModal({ behavior, onClose }: BatchLeftoverModalProps) {
  const keyboardUp = useKeyboardVisible();
  const categories = useBehaviorStore(state => state.categories);
  const updateBehavior = useBehaviorStore(state => state.updateBehavior);
  const [text, setText] = useState('');
  const status = getBatchStatus(behavior, categories);
  const leftover = parseDecimalInput(text);
  const adjustment = leftover != null ? getLeftoverAdjustment(behavior, categories, leftover) : null;
  if (!status || !behavior.batch) return null;
  const unit = status.unit ? ` ${status.unit}` : '';

  const handleSave = () => {
    if (!adjustment || !behavior.batch) return;
    updateBehavior(behavior.id, {
      defaultMetadata: adjustment.defaultMetadata,
      batch: { ...behavior.batch, cookedAmount: adjustment.cookedAmount },
    });
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Weigh the leftover</Text>
          <Text style={styles.hint}>
            {`Eaten so far ${roundTo2(status.eaten)}${unit}. The app expects ${status.left}${unit} left. Weigh what is really left (without the pot).`}
          </Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder={`Leftover${status.unit ? ` (${status.unit})` : ''}`}
            placeholderTextColor={Colors.text.faint}
            autoFocus
          />
          {adjustment && (
            <Text style={styles.result}>
              {`Cooked weight ${status.cooked}${unit} → ${adjustment.cookedAmount}${unit}. Macros per ${unit.trim() ? `100 ${status.unit}` : '100'} go up to match, and logged portions are recalculated.`}
            </Text>
          )}
          <View style={styles.actions}>
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!adjustment}
              onPress={handleSave}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  input: {
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 17,
    fontWeight: '600',
  },
  result: { color: '#4ade80', fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
