import React from 'react';
import type { DurationUnit } from '../../../components/duration-input';
import { DurationInput } from '../../../components/duration-input';

export type CooldownUnit = 'minutes' | 'hours' | 'days' | 'weeks';

const COOLDOWN_UNITS: DurationUnit[] = ['minutes', 'hours', 'days', 'weeks'];

interface Props {
  cooldownMinutes: number;
  onChange: (cooldownMinutes: number) => void;
  preferredUnit?: CooldownUnit;
  onUnitChange?: (unit: CooldownUnit) => void;
}

export function CooldownInput({ cooldownMinutes, onChange, preferredUnit, onUnitChange }: Props) {
  return (
    <DurationInput
      totalMinutes={cooldownMinutes}
      onChange={onChange}
      units={COOLDOWN_UNITS}
      preferredUnit={preferredUnit}
      onUnitChange={onUnitChange as (unit: DurationUnit) => void}
    />
  );
}
