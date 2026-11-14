import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { MAX_EYE_LEVEL_FACTOR, MIN_EYE_LEVEL_FACTOR } from '../../utils/sunlight-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const STEP = 0.05;

interface SunlightEyeLevelProps {
  /** Share in effect now. */
  factor: number;
}

/** How much of the sky's light reaches your eyes (you mostly look ahead or down); applies from when saved. */
export function SunlightEyeLevel({ factor }: SunlightEyeLevelProps) {
  const setFactor = useSunlightStore(state => state.setEyeLevelFactor);
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? factor;
  const changed = draft != null && Math.round(draft * 100) !== Math.round(factor * 100);

  const nudge = (delta: number) => {
    const next = Math.round((shown + delta) * 100) / 100;
    setDraft(Math.min(MAX_EYE_LEVEL_FACTOR, Math.max(MIN_EYE_LEVEL_FACTOR, next)));
  };
  const save = () => {
    if (draft == null) return;
    setFactor(draft);
    setDraft(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Light reaching your eyes</Text>
        <Pressable
          onPress={() => nudge(-STEP)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Decrease"
        >
          <Text style={styles.action}>−</Text>
        </Pressable>
        <Text style={styles.value}>{Math.round(shown * 100)}%</Text>
        <Pressable
          onPress={() => nudge(STEP)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Increase"
        >
          <Text style={styles.action}>+</Text>
        </Pressable>
        {changed && (
          <Pressable
            onPress={save}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.action}>Save</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>
        Share of the sky's light that reaches your eyes when you're not looking up. Applies from the moment you save;
        earlier time keeps its old share.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label: { flex: 1, color: Colors.text.secondary, fontSize: 13 },
  value: { color: Colors.text.primary, fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  action: { color: SUNLIGHT_COLOR, fontSize: 15, fontWeight: '700' },
  hint: { color: Colors.text.faint, fontSize: 11, lineHeight: 15 },
});
