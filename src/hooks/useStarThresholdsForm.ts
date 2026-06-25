import { useEffect, useMemo, useState } from 'react';
import type { BehaviorEntry, StarPeriod } from '../types/behavior';
import { DEFAULT_STAR_THRESHOLDS } from '../utils/starUtils';

export const STAR_SLOTS = ['1', '2', '3'] as const;
export type StarSlot = (typeof STAR_SLOTS)[number];
export type StarInputs = Record<StarSlot, string>;

/** Map a stored threshold to its TextInput string. `null` becomes `''`
 *  (not the literal string "null" — a footgun from `String(null)`). */
const thresholdToInput = (t: number | null): string => (t == null ? '' : String(t));

export interface ParsedStarThresholds {
  values: [number, number | null, number | null] | null;
  error: string | null;
}

export interface UseStarThresholdsFormResult {
  enabled: boolean;
  period: StarPeriod;
  inputs: StarInputs;
  validationError: string | null;
  parsedStars: ParsedStarThresholds;
  starThresholdsChanged: boolean;
  starPeriodChanged: boolean;
  handleToggle: () => void;
  handleInputChange: (slot: StarSlot, value: string) => void;
  handlePeriodChange: (period: StarPeriod) => void;
  setValidationError: (error: string | null) => void;
}

/** Encapsulates the opt-in stars sub-form for the Behavior form:
 *  toggle state, evaluation period, threshold inputs, parsing/
 *  validation, and dirty-check against an existing behavior. */
export function useStarThresholdsForm(
  behavior: BehaviorEntry | undefined,
  isEdit: boolean,
): UseStarThresholdsFormResult {
  const [enabled, setEnabled] = useState<boolean>(!!behavior?.starThresholds);
  const [period, setPeriod] = useState<StarPeriod>(behavior?.starPeriod ?? 'day');
  const [inputs, setInputs] = useState<StarInputs>({
    '1': '',
    '2': '',
    '3': '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Hydrate from the behavior whenever it changes (e.g. on edit mount).
  useEffect(() => {
    if (!behavior) return;
    const hasStars = behavior.starThresholds !== undefined;
    setEnabled(hasStars);
    setPeriod(behavior.starPeriod ?? 'day');
    setInputs(
      hasStars && behavior.starThresholds
        ? {
            '1': thresholdToInput(behavior.starThresholds[0]),
            '2': thresholdToInput(behavior.starThresholds[1]),
            '3': thresholdToInput(behavior.starThresholds[2]),
          }
        : { '1': '', '2': '', '3': '' },
    );
    setValidationError(null);
  }, [behavior]);

  const handleToggle = () => {
    setEnabled(prev => {
      const next = !prev;
      // Prefill defaults the first time the user enables stars.
      if (next && inputs['1'] === '' && inputs['2'] === '' && inputs['3'] === '') {
        setInputs({
          '1': String(DEFAULT_STAR_THRESHOLDS[0]),
          '2': String(DEFAULT_STAR_THRESHOLDS[1]),
          '3': String(DEFAULT_STAR_THRESHOLDS[2]),
        });
      }
      if (!next) {
        setValidationError(null);
      }
      return next;
    });
  };

  const handleInputChange = (slot: StarSlot, value: string) => {
    setInputs(prev => ({ ...prev, [slot]: value.replace(/[^0-9]/g, '') }));
  };

  const handlePeriodChange = (next: StarPeriod) => setPeriod(next);

  const parsedStars = useMemo<ParsedStarThresholds>(() => {
    if (!enabled) return { values: null, error: null };
    // Parse each slot. `null` = blank input (skip this tier). `NaN` = invalid.
    const parsed: (number | null)[] = STAR_SLOTS.map(k => {
      const raw = inputs[k].trim();
      if (raw === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : NaN;
    });
    if (parsed.some(n => Number.isNaN(n))) {
      return { values: null, error: 'Star thresholds must be positive integers' };
    }

    const defined = parsed.filter((n): n is number => n != null);
    for (let i = 1; i < defined.length; i++) {
      if (defined[i] <= defined[i - 1]) {
        return { values: null, error: 'Star thresholds must be in increasing order' };
      }
    }
    return { values: parsed as [number, number | null, number | null], error: null };
  }, [enabled, inputs]);

  if (!isEdit || !behavior) {
    return {
      enabled,
      period,
      inputs,
      validationError,
      parsedStars,
      starThresholdsChanged: false,
      starPeriodChanged: false,
      handleToggle,
      handleInputChange,
      handlePeriodChange,
      setValidationError,
    };
  }

  const savedStars = behavior.starThresholds ?? null;
  const newStars = enabled ? (parsedStars.values ?? null) : null;
  const starThresholdsChanged = JSON.stringify(savedStars) !== JSON.stringify(newStars);
  const starPeriodChanged = enabled && (behavior.starPeriod ?? 'day') !== period;

  return {
    enabled,
    period,
    inputs,
    validationError,
    parsedStars,
    starThresholdsChanged,
    starPeriodChanged,
    handleToggle,
    handleInputChange,
    handlePeriodChange,
    setValidationError,
  };
}
