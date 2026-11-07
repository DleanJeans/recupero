import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { useBehaviorStore } from '../../store/behavior-store';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { getCravingTone } from '../../utils/craving-tone';
import { getRefillBehaviorIds, NEED_INFO } from '../../utils/need-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { Text } from '../text';
import { NeedSheet } from './need-sheet';

const TONE = getCravingTone('desirable');

/** Needs below their craving line, shown at the top of the Cravings tab. Hidden when none are. */
export function NeedsCravingStrip() {
  const { needs, now } = useNeedLevels();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const [openId, setOpenId] = useState<NeedId>();
  const craving = useMemo(
    () => needs.filter(need => need.level != null && need.level < need.config.cravingLine),
    [needs],
  );
  const nameById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior.name])), [behaviors]);

  if (craving.length === 0 && !openId) return null;

  return (
    <View style={styles.section}>
      {craving.length > 0 && <CueSectionLabel>Needs</CueSectionLabel>}
      {craving.map(need => {
        const info = NEED_INFO[need.id];
        const names = getRefillBehaviorIds(need.config, behaviors, need.source, now, 2)
          .map(id => nameById.get(id))
          .filter(Boolean);
        return (
          <Pressable
            key={need.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => setOpenId(need.id)}
            accessibilityRole="button"
          >
            <Text style={styles.emoji}>{info.emoji}</Text>
            <View style={styles.text}>
              <Text style={styles.name}>
                {info.label} · {Math.round(need.level ?? 0)}%
              </Text>
              <Text style={styles.detail}>
                {TONE.title}
                {names.length ? ` · ${names.join(', ')}` : ''}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.text.faint}
            />
          </Pressable>
        );
      })}
      <NeedSheet
        needId={openId}
        onClose={() => setOpenId(undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: TONE.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 22,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  detail: {
    color: TONE.accent,
    fontSize: 12,
  },
});
