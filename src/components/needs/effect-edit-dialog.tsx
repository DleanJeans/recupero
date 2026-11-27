import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNeedsStore } from '../../store/needs-store';
import type { NeedEffect, NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { formatEffect } from '../../utils/need-effect-utils';
import { NEED_IDS, NEED_INFO } from '../../utils/need-utils';
import { Button } from '../button';
import { Text } from '../text';

const STEP = 5;

interface Props {
  behaviorId: string;
  behaviorName: string;
  /** The effect to edit; leave out to add one. */
  needId?: NeedId;
  onClose: () => void;
}

/** Sets a behaviour's side effect on a need: which need, "down to" a level or "change by" points. No keyboard. */
export function EffectEditDialog({ behaviorId, behaviorName, needId: initialNeedId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const configs = useNeedsStore(state => state.needs);
  const setEffect = useNeedsStore(state => state.setEffect);
  const existing = initialNeedId ? configs[initialNeedId]?.effects?.[behaviorId] : undefined;
  const needIds = NEED_IDS.filter(id => configs[id]?.enabled);
  const [needId, setNeedId] = useState<NeedId>(initialNeedId ?? (needIds.includes('energy') ? 'energy' : needIds[0]));
  const [kind, setKind] = useState<NeedEffect['kind']>(existing?.kind ?? 'to');
  const [amount, setAmount] = useState(existing?.amount ?? (kind === 'to' ? 25 : -20));

  const min = kind === 'to' ? 0 : -100;
  const changeKind = (next: NeedEffect['kind']) => {
    if (next === kind) return;
    setKind(next);
    setAmount(next === 'to' ? 25 : -20);
  };
  const step = (delta: number) => setAmount(value => Math.max(min, Math.min(100, Math.round(value + delta))));
  const valid = kind === 'to' || amount !== 0;

  const save = () => {
    if (initialNeedId && initialNeedId !== needId) setEffect(initialNeedId, behaviorId, undefined);
    const kept = initialNeedId === needId ? existing : undefined;
    setEffect(needId, behaviorId, { ...kept, kind, amount, source: 'you', seen: kept?.seen ?? 0 });
    onClose();
  };
  const remove = () => {
    if (initialNeedId) setEffect(initialNeedId, behaviorId, undefined);
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            Effect of {behaviorName}
          </Text>
          <Text style={styles.hint}>
            What it does to a need besides what it's for, e.g. a workout making you sleepy.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.needs}
          >
            {needIds.map(id => (
              <Pressable
                key={id}
                onPress={() => setNeedId(id)}
                style={[styles.chip, id === needId && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: id === needId }}
              >
                <Text
                  style={[styles.chipText, id === needId && styles.chipTextOn]}
                  numberOfLines={1}
                >
                  {NEED_INFO[id].emoji} {NEED_INFO[id].label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.segment}>
            {(['to', 'by'] as const).map(option => (
              <Pressable
                key={option}
                onPress={() => changeKind(option)}
                style={[styles.segmentItem, option === kind && styles.segmentOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: option === kind }}
              >
                <Text
                  style={[styles.segmentText, option === kind && styles.chipTextOn]}
                  numberOfLines={1}
                >
                  {option === 'to' ? 'Down to' : 'Change by'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            {kind === 'to'
              ? 'Takes the need down to this level from wherever it is. Never raises it.'
              : 'Moves the need by this many points. Negative lowers it.'}
          </Text>
          <View style={styles.stepper}>
            <Button
              onPress={() => step(-STEP)}
              disabled={amount <= min}
              accessibilityLabel="Less"
            >
              {`−${STEP}`}
            </Button>
            <Text
              style={[
                styles.amount,
                { color: kind === 'to' || amount < 0 ? Colors.typeText.undesirable : Colors.typeText.desirable },
              ]}
              numberOfLines={1}
            >
              {NEED_INFO[needId]?.emoji} {formatEffect({ kind, amount })}
            </Text>
            <Button
              onPress={() => step(STEP)}
              disabled={amount >= 100}
              accessibilityLabel="More"
            >
              {`+${STEP}`}
            </Button>
          </View>
          {existing && existing.source === 'learned' ? (
            <Text style={styles.hint}>Learned from {existing.seen} check-ins. Saving makes it yours.</Text>
          ) : null}
          <View style={styles.actions}>
            {initialNeedId ? (
              <Button
                variant="danger"
                onPress={remove}
              >
                Remove
              </Button>
            ) : null}
            <View style={styles.spacer} />
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onPress={save}
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
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  needs: { gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chipOn: { backgroundColor: Colors.cooldown.yellow, borderColor: Colors.cooldown.yellow },
  chipText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: Colors.bg.black },
  segment: { flexDirection: 'row', backgroundColor: Colors.bg.input, borderRadius: 10, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segmentOn: { backgroundColor: Colors.cooldown.yellow },
  segmentText: { color: Colors.text.secondary, fontSize: 14, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  amount: { flexShrink: 0, minWidth: 110, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  spacer: { flex: 1 },
});
