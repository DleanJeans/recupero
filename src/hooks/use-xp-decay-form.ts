import { useEffect, useRef, useState } from 'react';
import type { DurationUnit } from '../components/duration-input';
import type { BehaviorEntry, XpDecayUnit } from '../types/behavior';

const DECAY_UNITS: DurationUnit[] = ['hours', 'days', 'weeks', 'months'];

interface UseXPDecayFormResult {
  enabled: boolean;
  every: number;
  unit: DurationUnit;
  xpDecayChanged: boolean;
  handleToggle: () => void;
  handleChangeEvery: (every: number) => void;
  handleUnitChange: (unit: DurationUnit) => void;
  /** Serialized form value to pass to addBehavior / updateBehavior. */
  serialized: BehaviorEntry['xpDecay'];
}

/** Encapsulates the opt-in XP-decay sub-form for the Behavior form:
 *  toggle, `every` value + unit, dirty-check, and serialization. */
export function useXPDecayForm(behavior: BehaviorEntry | undefined, isEdit: boolean): UseXPDecayFormResult {
  const [enabled, setEnabled] = useState<boolean>(!!behavior?.xpDecay);
  const [every, setEvery] = useState(() => behavior?.xpDecay?.every ?? 1);
  const [unit, setUnit] = useState<DurationUnit>(() => behavior?.xpDecay?.unit ?? 'days');
  const skipInitialHydration = useRef(behavior != null);

  // Hydrate from the behavior whenever it changes (e.g. on edit mount).
  useEffect(() => {
    if (!behavior) return;
    if (skipInitialHydration.current) {
      skipInitialHydration.current = false;
      return;
    }
    if (!behavior.xpDecay) {
      setEnabled(false);
      setEvery(1);
      setUnit('days');
      return;
    }
    setEnabled(true);
    setUnit(behavior.xpDecay.unit);
    setEvery(behavior.xpDecay.every);
  }, [behavior]);

  const handleToggle = () => {
    setEnabled(prev => {
      const next = !prev;
      if (next && every === 0) {
        // Reasonable default the first time the user enables decay.
        setEvery(1);
        setUnit('days');
      }
      return next;
    });
  };

  const handleUnitChange = (newUnit: DurationUnit) => {
    if (!DECAY_UNITS.includes(newUnit)) return;
    setUnit(newUnit);
  };

  const handleChangeEvery = (value: number) => {
    setEvery(Math.max(0, value));
  };

  const serialized: BehaviorEntry['xpDecay'] = enabled
    ? { every: Math.max(1, Math.round(every)), unit: unit as XpDecayUnit }
    : undefined;

  const xpDecayChanged =
    isEdit && behavior ? JSON.stringify(behavior.xpDecay ?? null) !== JSON.stringify(serialized ?? null) : false;

  return {
    enabled,
    every,
    unit,
    xpDecayChanged,
    handleToggle,
    handleChangeEvery,
    handleUnitChange,
    serialized,
  };
}
