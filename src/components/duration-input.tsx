import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text, TextInput } from './text';
import { UnitDropdown } from './unit-dropdown';

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

  const handleUnitChange = useCallback(
    (newUnit: DurationUnit) => {
      setUnit(newUnit);
      onUnitChange?.(newUnit);
    },
    [onUnitChange],
  );

  return (
    <View style={styles.row}>
      <NumberInput
        value={displayValue}
        onChangeText={handleValueChange}
      />
      <UnitDropdown
        value={unit}
        options={units}
        onChange={handleUnitChange}
      />
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
