import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

export type CooldownUnit = 'minutes' | 'hours' | 'days' | 'weeks';

const UNITS: CooldownUnit[] = ['minutes', 'hours', 'days', 'weeks'];

const UNIT_MULTIPLIER: Record<CooldownUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

const NICE_FRACTIONS = [0, 0.25, 0.5, 0.75];

function detectBestUnit(minutes: number): CooldownUnit {
  if (minutes === 0) return 'hours';
  const units: CooldownUnit[] = ['weeks', 'days', 'hours', 'minutes'];
  for (const u of units) {
    const value = minutes / UNIT_MULTIPLIER[u];
    const fraction = value - Math.floor(value);
    if (NICE_FRACTIONS.includes(fraction)) {
      return u;
    }
  }
  return 'minutes';
}

interface Props {
  cooldownMinutes: number;
  onChange: (cooldownMinutes: number) => void;
  preferredUnit?: CooldownUnit;
  onUnitChange?: (unit: CooldownUnit) => void;
}

export function CooldownInput({ cooldownMinutes, onChange, preferredUnit, onUnitChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unit, setUnit] = useState<CooldownUnit>(preferredUnit ?? 'hours');

  // Sync unit when the actual cooldown minutes are known (handles edit-mode data arriving via useEffect in the parent)
  useEffect(() => {
    if (preferredUnit) {
      setUnit(preferredUnit);
    } else {
      setUnit(detectBestUnit(cooldownMinutes));
    }
  }, [cooldownMinutes, preferredUnit]);

  const displayValue = useMemo(
    () => (cooldownMinutes === 0 ? '' : String(Math.round(cooldownMinutes / UNIT_MULTIPLIER[unit]))),
    [cooldownMinutes, unit],
  );

  const handleValueChange = useCallback(
    (text: string) => {
      const num = Number(text);
      if (!isNaN(num) && num >= 0) {
        onChange(Math.round(num * UNIT_MULTIPLIER[unit]));
      }
    },
    [onChange, unit],
  );

  const handleUnitSelect = useCallback(
    (newUnit: CooldownUnit) => {
      setUnit(newUnit);
      onUnitChange?.(newUnit);
      setPickerOpen(false);
    },
    [onUnitChange],
  );

  return (
    <View style={styles.row}>
      <NumberInput
        value={displayValue}
        onChangeText={handleValueChange}
      />
      <View style={styles.unitWrapper}>
        <UnitButton
          unit={unit}
          onPress={() => setPickerOpen(!pickerOpen)}
        />
        <UnitPicker
          open={pickerOpen}
          currentUnit={unit}
          onSelect={handleUnitSelect}
          onClose={() => setPickerOpen(false)}
        />
      </View>
    </View>
  );
}

interface NumberInputProps {
  value: string;
  onChangeText: (text: string) => void;
}
function NumberInput({ value, onChangeText }: NumberInputProps) {
  return (
    <TextInput
      style={styles.numberInput}
      keyboardType="numeric"
      value={value}
      onChangeText={onChangeText}
      placeholder="0"
      placeholderTextColor={Colors.text.faint}
      selectTextOnFocus
    />
  );
}

interface UnitButtonProps {
  unit: CooldownUnit;
  onPress: () => void;
}
function UnitButton({ unit, onPress }: UnitButtonProps) {
  return (
    <Pressable
      style={styles.unitButton}
      onPress={onPress}
    >
      <Text style={styles.unitText}>{unit}</Text>
      <Text style={styles.chevron}>▼</Text>
    </Pressable>
  );
}

interface UnitPickerProps {
  open: boolean;
  currentUnit: CooldownUnit;
  onSelect: (unit: CooldownUnit) => void;
  onClose: () => void;
}
function UnitPicker({ open, currentUnit, onSelect, onClose }: UnitPickerProps) {
  if (!open) return null;

  return (
    <>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.dropdown}>
        {UNITS.map(u => (
          <UnitOption
            key={u}
            unit={u}
            active={u === currentUnit}
            onPress={() => onSelect(u)}
          />
        ))}
      </View>
    </>
  );
}

interface UnitOptionProps {
  unit: CooldownUnit;
  active: boolean;
  onPress: () => void;
}
function UnitOption({ unit, active, onPress }: UnitOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerOption,
        active && styles.pickerOptionActive,
        pressed && {
          opacity: 0.6,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>{unit}</Text>
    </Pressable>
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
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  unitButton: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    color: Colors.text.muted,
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
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 4,
    zIndex: 11,
    shadowColor: Colors.bg.black,
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
    color: Colors.text.primary,
    fontSize: 15,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
  },
});
