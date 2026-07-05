import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { UnitDropdown } from '../../../components/unit-dropdown';
import type { StarPeriod } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

const PERIODS: readonly StarPeriod[] = ['day', 'week', 'month'];

interface Props {
  value: StarPeriod;
  onChange: (value: StarPeriod) => void;
}

/** Dropdown that picks how often `starThresholds` are evaluated. */
export function StarPeriodPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Star every:</Text>
      <UnitDropdown
        value={value}
        options={PERIODS}
        onChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
