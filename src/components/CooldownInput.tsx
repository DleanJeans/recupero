import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './Text';

type CooldownUnit = 'minutes' | 'hours' | 'days' | 'weeks';

const UNITS: CooldownUnit[] = [
  'minutes',
  'hours',
  'days',
  'weeks',
];

const UNIT_MULTIPLIER: Record<CooldownUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

function bestUnit(minutes: number): CooldownUnit {
  if (minutes === 0) return 'minutes';
  if (minutes % 10080 === 0) return 'weeks';
  if (minutes % 1440 === 0) return 'days';
  if (minutes % 60 === 0) return 'hours';
  return 'minutes';
}

interface Props {
  cooldownMinutes: number;
  onChange: (cooldownMinutes: number) => void;
}

export function CooldownInput({ cooldownMinutes, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unit, setUnit] = useState<CooldownUnit>(() => bestUnit(cooldownMinutes));

  const displayValue = useMemo(
    () => String(Math.round(cooldownMinutes / UNIT_MULTIPLIER[unit])),
    [
      cooldownMinutes,
      unit,
    ],
  );

  const handleValueChange = useCallback(
    (text: string) => {
      const num = Number(text);
      if (!isNaN(num) && num >= 0) {
        onChange(Math.round(num * UNIT_MULTIPLIER[unit]));
      }
    },
    [
      onChange,
      unit,
    ],
  );

  const handleUnitSelect = useCallback(
    (newUnit: CooldownUnit) => {
      const num = Number(displayValue) || 0;
      onChange(Math.round(num * UNIT_MULTIPLIER[newUnit]));
      setUnit(newUnit);
      setPickerOpen(false);
    },
    [
      displayValue,
      onChange,
      setUnit,
    ],
  );

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.numberInput}
        keyboardType="numeric"
        value={displayValue}
        onChangeText={handleValueChange}
        placeholder="0"
        placeholderTextColor="#666"
        selectTextOnFocus
      />
      <Pressable
        style={styles.unitButton}
        onPress={() => setPickerOpen(true)}
      >
        <Text style={styles.unitText}>{unit}</Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select unit</Text>
            {UNITS.map((u) => (
              <Pressable
                key={u}
                style={({ pressed }) => [
                  styles.pickerOption,
                  u === unit && styles.pickerOptionActive,
                  pressed && {
                    opacity: 0.6,
                  },
                ]}
                onPress={() => handleUnitSelect(u)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    u === unit && styles.pickerOptionTextActive,
                  ]}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  unitButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    color: '#888',
    fontSize: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerSheet: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
  },
  pickerTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pickerOptionText: {
    color: '#fff',
    fontSize: 17,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
  },
});
