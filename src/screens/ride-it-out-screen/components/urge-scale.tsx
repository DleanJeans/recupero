import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { UrgeLevel } from '../../../types/craving';
import { Colors } from '../../../utils/colors';
import type { CravingTone } from '../../../utils/craving-tone';
import { URGE_LEVELS } from '../../../utils/craving-utils';

interface UrgeScaleProps {
  value: UrgeLevel | undefined;
  onSelect: (level: UrgeLevel) => void;
  tone: CravingTone;
}

export function UrgeScale({ value, onSelect, tone }: UrgeScaleProps) {
  return (
    <View style={styles.row}>
      {URGE_LEVELS.map(({ level, label }) => {
        const active = value === level;
        return (
          <Pressable
            key={level}
            style={({ pressed }) => [
              styles.cell,
              active && { backgroundColor: tone.accent },
              pressed && styles.pressed,
            ]}
            onPress={() => onSelect(level)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Urge ${level} of 5${label ? `, ${label}` : ''}`}
          >
            <Text style={[styles.level, active && { color: tone.onAccent }]}>{level}</Text>
            {label ? <Text style={[styles.label, active && { color: tone.onAccent }]}>{label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    height: 52,
    borderRadius: 11,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  level: { color: Colors.text.muted, fontSize: 17, fontWeight: '700' },
  label: { color: Colors.text.muted, fontSize: 10, fontWeight: '500', marginTop: 1 },
});
