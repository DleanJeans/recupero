import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { UrgeLevel } from '../../../types/craving';
import { Colors } from '../../../utils/colors';
import { URGE_LEVELS } from '../../../utils/craving-utils';

interface UrgeScaleProps {
  value: UrgeLevel | undefined;
  onSelect: (level: UrgeLevel) => void;
}

export function UrgeScale({ value, onSelect }: UrgeScaleProps) {
  return (
    <View style={styles.row}>
      {URGE_LEVELS.map(({ level, label }) => {
        const active = value === level;
        return (
          <Pressable
            key={level}
            style={({ pressed }) => [styles.cell, active && styles.cellActive, pressed && styles.pressed]}
            onPress={() => onSelect(level)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Urge ${level} of 5${label ? `, ${label}` : ''}`}
          >
            <Text style={[styles.level, active && styles.textActive]}>{level}</Text>
            {label ? <Text style={[styles.label, active && styles.textActive]}>{label}</Text> : null}
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
  cellActive: { backgroundColor: Colors.type.undesirable },
  pressed: { opacity: 0.75 },
  level: { color: Colors.text.muted, fontSize: 17, fontWeight: '700' },
  label: { color: Colors.text.muted, fontSize: 10, fontWeight: '500', marginTop: 1 },
  textActive: { color: Colors.typeBtn.undesirable },
});
