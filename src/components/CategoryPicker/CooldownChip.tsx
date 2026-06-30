import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors } from '../../utils/colors';
import { COOLDOWN_FILTER_LABEL, countCooldownBehaviors } from '../../utils/cooldownFilter';
import { CategoryBarChip } from './CategoryBarChip';

interface CooldownChipProps {
  active: boolean;
  onPress: () => void;
}

export function CooldownChip({ active, onPress }: CooldownChipProps) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const hideNames = useSettingsStore(s => s.hideCategoryNames);
  const count = useMemo(() => countCooldownBehaviors(behaviors), [behaviors]);

  return (
    <CategoryBarChip
      active={active}
      icon={
        <Ionicons
          name="timer-outline"
          size={13}
          color={active ? Colors.text.primary : Colors.text.faint}
        />
      }
      label={COOLDOWN_FILTER_LABEL}
      count={count}
      showLabel={!hideNames}
      onPress={onPress}
      accessibilityLabel={`${COOLDOWN_FILTER_LABEL} behaviors`}
    />
  );
}
