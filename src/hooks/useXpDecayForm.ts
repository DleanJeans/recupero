import { useEffect, useRef, useState } from 'react';
import type { DurationUnit } from '../components/DurationInput';
import type { BehaviorEntry, XpDecayUnit } from '../types/behavior';

const UNIT_MINUTES: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200,
};

const DECAY_UNITS: DurationUnit[] = ['hours', 'days', 'weeks', 'months'];

interface UseXpDecayFormResult {
  enabled: boolean;
  everyMinutes: number;
  unit: DurationUnit;
  xpDecayChanged: boolean;
  handleToggle: () => void;
  handleChangeMinutes: (minutes: number) => void;
  handleUnitChange: (unit: DurationUnit) => void;
  /** Serialized form value to pass to addBehavior / updateBehavior. */
  serialized: BehaviorEntry['xpDecay'];
}

/** Encapsulates the opt-in XP-decay sub-form for the Behavior form:
 *  toggle, `every` value + unit, dirty-check, and serialization. */
export function useXpDecayForm(behavior: BehaviorEntry | undefined, isEdit: boolean): UseXpDecayFormResult {
  const [enabled, setEnabled] = useState<boolean>(!!behavior?.xpDecay);
  const [everyMinutes, setEveryMinutes] = useState(() =>
    behavior?.xpDecay ? toMinutes(behavior.xpDecay.every, behavior.xpDecay.unit) : 1440,
  );
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
      setEveryMinutes(1440);
      setUnit('days');
      return;
    }
    setEnabled(true);
    setUnit(behavior.xpDecay.unit);
    setEveryMinutes(toMinutes(behavior.xpDecay.every, behavior.xpDecay.unit));
  }, [behavior]);

  const handleToggle = () => {
    setEnabled(prev => {
      const next = !prev;
      if (next && everyMinutes === 0) {
        // Reasonable default the first time the user enables decay.
        setEveryMinutes(1440);
        setUnit('days');
      }
      return next;
    });
  };

  const handleUnitChange = (newUnit: DurationUnit) => {
    if (!DECAY_UNITS.includes(newUnit)) return;
    const currentEvery = Math.max(1, Math.round(everyMinutes / UNIT_MINUTES[unit]));
    setUnit(newUnit);
    setEveryMinutes(currentEvery * UNIT_MINUTES[newUnit]);
  };

  const handleChangeMinutes = (minutes: number) => {
    setEveryMinutes(Math.max(0, minutes));
  };

  const serialized: BehaviorEntry['xpDecay'] = enabled
    ? { every: Math.max(1, Math.round(everyMinutes / UNIT_MINUTES[unit])), unit: unit as XpDecayUnit }
    : undefined;

  const xpDecayChanged =
    isEdit && behavior ? JSON.stringify(behavior.xpDecay ?? null) !== JSON.stringify(serialized ?? null) : false;

  return {
    enabled,
    everyMinutes,
    unit,
    xpDecayChanged,
    handleToggle,
    handleChangeMinutes,
    handleUnitChange,
    serialized,
  };
}

function toMinutes(every: number, unit: XpDecayUnit): number {
  return every * UNIT_MINUTES[unit];
}
