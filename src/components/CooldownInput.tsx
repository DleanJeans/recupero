import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
      <View style={styles.unitWrapper}>
        <Pressable
          style={styles.unitButton}
          onPress={() => setPickerOpen(!pickerOpen)}
        >
          <Text style={styles.unitText}>{unit}</Text>
          <Text style={styles.chevron}>▼</Text>
        </Pressable>
        {pickerOpen && (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={() => setPickerOpen(false)}
            />
            <View style={styles.dropdown}>
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
          </>
        )}
      </View>
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
  unitWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    bottom: 44,
    right: 0,
    minWidth: 140,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 4,
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pickerOptionText: {
    color: '#fff',
    fontSize: 15,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
  },
});
