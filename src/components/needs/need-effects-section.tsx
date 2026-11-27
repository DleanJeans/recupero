import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../store/behavior-store';
import { useNeedsStore } from '../../store/needs-store';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import type { NeedEffect, NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import {
  CANT_SLEEP_LEVEL,
  formatEffect,
  formatEffectSource,
  getNeedEffectBehaviors,
  isLateNight,
  isLoweringEffect,
} from '../../utils/need-effect-utils';
import { NEED_INFO } from '../../utils/need-utils';
import { BehaviorIcon } from '../behavior-icon';
import { CueSectionLabel } from '../cues/cue-section-label';
import { Text } from '../text';
import { EffectEditDialog } from './effect-edit-dialog';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  needId: NeedId;
}

/** "Lowers this" and "Raises this": behaviours with a side effect on the need. Tap to log, tap the amount to edit. */
export function NeedEffectsSection({ needId }: Props) {
  const navigation = useNavigation<Navigation>();
  const config = useNeedsStore(state => state.needs[needId]);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const [editing, setEditing] = useState<BehaviorEntry | undefined>();
  const { lowers, raises } = useMemo(() => getNeedEffectBehaviors(config ?? {}), [config]);

  const rows = (entries: Array<{ behaviorId: string; effect: NeedEffect }>) =>
    entries.flatMap(({ behaviorId, effect }) => {
      const behavior = behaviors.find(item => item.id === behaviorId);
      if (!behavior || behavior.archivedAt != null) return [];
      const lowering = isLoweringEffect(effect);
      return [
        <Pressable
          key={behaviorId}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log' })}
          accessibilityRole="button"
          accessibilityLabel={`Log ${behavior.name}`}
        >
          <BehaviorIcon
            behavior={behavior}
            size={24}
          />
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {behavior.name}
          </Text>
          <Pressable
            onPress={() => setEditing(behavior)}
            hitSlop={6}
            style={[styles.chip, lowering ? styles.chipNeg : styles.chipPos]}
            accessibilityRole="button"
            accessibilityLabel={`Effect ${formatEffect(effect)}, tap to edit`}
          >
            <Text
              style={[styles.chipText, { color: lowering ? Colors.typeText.undesirable : Colors.typeText.desirable }]}
              numberOfLines={1}
            >
              {formatEffect(effect)}
            </Text>
          </Pressable>
          <Text
            style={styles.source}
            numberOfLines={1}
          >
            {formatEffectSource(effect)}
          </Text>
        </Pressable>,
      ];
    });

  const lowerRows = rows(lowers);
  const raiseRows = rows(raises);
  if (lowerRows.length === 0 && raiseRows.length === 0) return null;

  return (
    <>
      {lowerRows.length > 0 ? (
        <>
          <CueSectionLabel>Lowers this</CueSectionLabel>
          <View style={styles.list}>{lowerRows}</View>
        </>
      ) : null}
      {raiseRows.length > 0 ? (
        <>
          <CueSectionLabel>Raises this</CueSectionLabel>
          <View style={styles.list}>{raiseRows}</View>
        </>
      ) : null}
      {editing ? (
        <EffectEditDialog
          behaviorId={editing.id}
          behaviorName={editing.name}
          needId={needId}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </>
  );
}

interface HintProps {
  needId: NeedId;
  level: number | undefined;
  now: number;
}

/** Brain Energy still high late at night: names the behaviour that lowers it most. */
export function CantSleepHint({ needId, level, now }: HintProps) {
  const config = useNeedsStore(state => state.needs[needId]);
  const behaviors = useBehaviorStore(state => state.behaviors);
  if (needId !== 'energy' || level == null || level < CANT_SLEEP_LEVEL || !isLateNight(now)) return null;
  const top = getNeedEffectBehaviors(config ?? {}).lowers.find(({ behaviorId }) =>
    behaviors.some(item => item.id === behaviorId && item.archivedAt == null),
  );
  if (!top) return null;
  const name = behaviors.find(item => item.id === top.behaviorId)?.name;
  const what =
    top.effect.kind === 'to'
      ? `usually takes ${NEED_INFO[needId].label} down to ${Math.round(top.effect.amount)}%.`
      : `usually drops ${NEED_INFO[needId].label} ${Math.abs(Math.round(top.effect.amount))}%.`;
  return (
    <View style={styles.hint}>
      <Text style={styles.hintText}>
        🌙 Can't sleep? <Text style={styles.hintName}>{name}</Text> {what}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.bg.card, borderRadius: 12, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
  name: { flex: 1, minWidth: 0, color: Colors.text.primary, fontSize: 15 },
  chip: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, flexShrink: 0 },
  chipNeg: { backgroundColor: '#3a1d1d', borderColor: '#5a2a2a' },
  chipPos: { backgroundColor: '#183324', borderColor: '#23533a' },
  chipText: { fontSize: 13, fontWeight: '700' },
  source: { color: Colors.text.faint, fontSize: 11, minWidth: 48, flexShrink: 0, textAlign: 'right' },
  hint: {
    backgroundColor: '#15281d',
    borderColor: '#23533a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  hintText: { color: '#a7f3c0', fontSize: 13, lineHeight: 19 },
  hintName: { color: Colors.text.primary, fontWeight: '700' },
});
