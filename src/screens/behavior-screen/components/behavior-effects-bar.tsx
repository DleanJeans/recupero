import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EffectEditDialog } from '../../../components/needs/effect-edit-dialog';
import { Text } from '../../../components/text';
import { useNeedLevels } from '../../../hooks/use-need-levels';
import { useNeedsStore } from '../../../store/needs-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import {
  describeEffectForecast,
  forecastEffect,
  formatEffect,
  getBehaviorEffects,
  isLoweringEffect,
} from '../../../utils/need-effect-utils';
import { NEED_IDS, NEED_INFO } from '../../../utils/need-utils';

interface Props {
  behavior: BehaviorEntry;
  /** Forecasts are for new logs only. */
  editing: boolean;
}

/**
 * Above the Log button: this behaviour's side effects on needs as chips (tap to edit), and for a new log
 * a one-line heads-up of where each lowered need would end up. Hidden when the behaviour has no effects.
 */
export function BehaviorEffectsBar({ behavior, editing }: Props) {
  const configs = useNeedsStore(state => state.needs);
  const { needs } = useNeedLevels();
  const [editTarget, setEditing] = useState<{ needId?: NeedId } | undefined>();
  const effects = useMemo(() => getBehaviorEffects(configs, behavior.id, NEED_IDS), [configs, behavior.id]);

  const warnings = useMemo(() => {
    if (editing) return [];
    return effects.flatMap(({ needId, effect }) => {
      if (!isLoweringEffect(effect)) return [];
      const level = needs.find(need => need.id === needId)?.level;
      const text = describeEffectForecast(NEED_INFO[needId].label, level, effect);
      if (!text) return [];
      const line = configs[needId].cravingLine;
      const crosses = level != null && level > line && forecastEffect(level, effect) <= line;
      return [{ needId, text: crosses ? `${text}, at or below your ${line}% line.` : `${text}.`, crosses }];
    });
  }, [editing, effects, needs, configs]);

  if (effects.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        <Text
          style={styles.label}
          numberOfLines={1}
        >
          Effects
        </Text>
        {effects.map(({ needId, effect }) => {
          const lowers = isLoweringEffect(effect);
          return (
            <Pressable
              key={needId}
              onPress={() => setEditing({ needId })}
              style={[styles.chip, lowers ? styles.chipNeg : styles.chipPos]}
              accessibilityRole="button"
              accessibilityLabel={`${NEED_INFO[needId].label} ${formatEffect(effect)}. Edit`}
            >
              <Text
                style={[styles.chipText, { color: lowers ? Colors.typeText.undesirable : Colors.typeText.desirable }]}
                numberOfLines={1}
              >
                {NEED_INFO[needId].emoji} {formatEffect(effect)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setEditing({})}
          style={[styles.chip, styles.chipAdd]}
          accessibilityRole="button"
          accessibilityLabel="Add an effect"
        >
          <Text
            style={[styles.chipText, { color: Colors.text.light }]}
            numberOfLines={1}
          >
            ＋
          </Text>
        </Pressable>
      </View>
      {warnings.map(warning => (
        <View
          key={warning.needId}
          style={[styles.warning, warning.crosses && styles.warningStrong]}
        >
          <Text style={[styles.warningText, warning.crosses && styles.warningTextStrong]}>
            {warning.crosses ? '⚠️ ' : ''}
            {NEED_INFO[warning.needId].emoji} {warning.text}
          </Text>
        </View>
      ))}
      {editTarget ? (
        <EffectEditDialog
          behaviorId={behavior.id}
          behaviorName={behavior.name}
          needId={editTarget.needId}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  label: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', marginRight: 2 },
  chip: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  chipNeg: { backgroundColor: '#3a1d1d', borderColor: '#5a2a2a' },
  chipPos: { backgroundColor: '#183324', borderColor: '#23533a' },
  chipAdd: { backgroundColor: Colors.bg.input, borderColor: Colors.border.default },
  chipText: { fontSize: 13, fontWeight: '700' },
  warning: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.bg.card },
  warningStrong: { backgroundColor: '#2e2610', borderWidth: 1, borderColor: '#5a4716' },
  warningText: { color: Colors.text.secondary, fontSize: 13, lineHeight: 18 },
  warningTextStrong: { color: '#fcd34d' },
});
