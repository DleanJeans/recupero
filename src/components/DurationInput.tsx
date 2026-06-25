import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text, TextInput } from './Text';

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

const UNIT_MINUTES: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200, // 30-day approximation
};

const NICE_FRACTIONS = [0, 0.25, 0.5, 0.75];

/** Pick the largest unit from `units` whose conversion gives a "nice" value. */
function detectBestUnit(totalMinutes: number, units: DurationUnit[]): DurationUnit {
  if (totalMinutes === 0) return units[units.length - 1];
  for (const u of units) {
    const value = totalMinutes / UNIT_MINUTES[u];
    const fraction = value - Math.floor(value);
    if (NICE_FRACTIONS.includes(fraction)) {
      return u;
    }
  }
  return units[units.length - 1];
}

interface DurationInputProps {
  /** Total duration in minutes. */
  totalMinutes: number;
  onChange: (totalMinutes: number) => void;
  /** Allowed units, ordered from smallest to largest. */
  units: DurationUnit[];
  /** Controlled unit (optional). When omitted, the input picks the best unit. */
  preferredUnit?: DurationUnit;
  onUnitChange?: (unit: DurationUnit) => void;
}

export function DurationInput({ totalMinutes, onChange, units, preferredUnit, onUnitChange }: DurationInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unit, setUnit] = useState<DurationUnit>(preferredUnit ?? units[units.length - 1]);

  // Sync unit when external value or preferred unit changes (handles edit-mode data arriving via useEffect in the parent).
  useEffect(() => {
    if (preferredUnit) {
      setUnit(preferredUnit);
    } else {
      setUnit(detectBestUnit(totalMinutes, units));
    }
  }, [totalMinutes, preferredUnit, units]);

  const displayValue = useMemo(
    () => (totalMinutes === 0 ? '' : String(Math.round(totalMinutes / UNIT_MINUTES[unit]))),
    [totalMinutes, unit],
  );

  const handleValueChange = useCallback(
    (text: string) => {
      const num = Number(text);
      if (!Number.isNaN(num) && num >= 0) {
        onChange(Math.round(num * UNIT_MINUTES[unit]));
      }
    },
    [onChange, unit],
  );

  const handleUnitSelect = useCallback(
    (newUnit: DurationUnit) => {
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
          units={units}
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
  unit: DurationUnit;
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
  units: DurationUnit[];
  currentUnit: DurationUnit;
  onSelect: (unit: DurationUnit) => void;
  onClose: () => void;
}
function UnitPicker({ open, units, currentUnit, onSelect, onClose }: UnitPickerProps) {
  if (!open) return null;

  return (
    <>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.dropdown}>
        {units.map(u => (
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
  unit: DurationUnit;
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
