import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors } from '../../utils/colors';
import { COOLDOWN_FILTER_LABEL, countBehaviorsPastCooldown, countCooldownBehaviors } from '../../utils/cooldownFilter';
import { Badge } from '../Badge';
import { CategoryBarChip } from './CategoryBarChip';

interface CooldownChipProps {
  active: boolean;
  onPress: () => void;
}

export function CooldownChip({ active, onPress }: CooldownChipProps) {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const hideNames = useSettingsStore(s => s.hideCategoryNames);
  const count = useMemo(() => countCooldownBehaviors(behaviors), [behaviors]);
  const pastCooldownCount = useMemo(() => countBehaviorsPastCooldown(behaviors), [behaviors]);
  const showBadge = pastCooldownCount > 0;

  return (
    <CategoryBarChip
      active={active}
      icon={
        <View style={styles.iconWrap}>
          <Ionicons
            name="timer-outline"
            size={13}
            color={active ? Colors.text.primary : Colors.text.faint}
          />
          {showBadge && (
            <Badge
              count={pastCooldownCount}
              fontSize={8}
              style={styles.badge}
            />
          )}
        </View>
      }
      label={COOLDOWN_FILTER_LABEL}
      count={count}
      showLabel={!hideNames}
      onPress={onPress}
      accessibilityLabel={
        showBadge
          ? `${COOLDOWN_FILTER_LABEL} behaviors, ${pastCooldownCount} past cooldown`
          : `${COOLDOWN_FILTER_LABEL} behaviors`
      }
    />
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'relative',
    width: 19,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -10,
    left: -16,
  },
});
