import { useEffect, useMemo, useRef, useState } from 'react';
import type { BehaviorEntry, StarMoneyMultipliers } from '../types/behavior';
import { DEFAULT_STAR_MONEY_MULTIPLIERS } from '../utils/star-utils';
import { STAR_SLOTS, type StarInputs, type StarSlot } from './use-star-thresholds-form';

const multiplierToInput = (value: number): string => String(value);

function inputsFromMultipliers(multipliers: StarMoneyMultipliers): StarInputs {
  return {
    '1': multiplierToInput(multipliers[0]),
    '2': multiplierToInput(multipliers[1]),
    '3': multiplierToInput(multipliers[2]),
  };
}

export interface ParsedStarMoneyMultipliers {
  values: StarMoneyMultipliers | null;
  error: string | null;
}

export interface UseStarMoneyMultipliersFormResult {
  inputs: StarInputs;
  validationError: string | null;
  parsedMultipliers: ParsedStarMoneyMultipliers;
  changed: boolean;
  handleInputChange: (slot: StarSlot, value: string) => void;
  setValidationError: (error: string | null) => void;
}

export function useStarMoneyMultipliersForm(
  behavior: BehaviorEntry | undefined,
  isEdit: boolean,
): UseStarMoneyMultipliersFormResult {
  const [inputs, setInputs] = useState<StarInputs>(() =>
    inputsFromMultipliers(behavior?.starMoneyMultipliers ?? DEFAULT_STAR_MONEY_MULTIPLIERS),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const skipInitialHydration = useRef(behavior != null);

  useEffect(() => {
    if (!behavior) return;
    if (skipInitialHydration.current) {
      skipInitialHydration.current = false;
      return;
    }
    setInputs(inputsFromMultipliers(behavior.starMoneyMultipliers ?? DEFAULT_STAR_MONEY_MULTIPLIERS));
    setValidationError(null);
  }, [behavior]);

  const handleInputChange = (slot: StarSlot, value: string) => {
    setInputs(prev => ({ ...prev, [slot]: value.replace(/[^0-9.]/g, '') }));
  };

  const parsedMultipliers = useMemo<ParsedStarMoneyMultipliers>(() => {
    const parsed = STAR_SLOTS.map(slot => {
      const raw = inputs[slot].trim();
      if (raw === '') return NaN;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : NaN;
    });

    if (parsed.some(Number.isNaN)) {
      return { values: null, error: 'Star money multipliers must be non-negative numbers' };
    }

    return { values: parsed as StarMoneyMultipliers, error: null };
  }, [inputs]);

  if (!isEdit || !behavior) {
    return {
      inputs,
      validationError,
      parsedMultipliers,
      changed: false,
      handleInputChange,
      setValidationError,
    };
  }

  const savedMultipliers = behavior.starMoneyMultipliers ?? DEFAULT_STAR_MONEY_MULTIPLIERS;
  const nextMultipliers = parsedMultipliers.values ?? DEFAULT_STAR_MONEY_MULTIPLIERS;

  return {
    inputs,
    validationError,
    parsedMultipliers,
    changed: JSON.stringify(savedMultipliers) !== JSON.stringify(nextMultipliers),
    handleInputChange,
    setValidationError,
  };
}
