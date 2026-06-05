import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type CooldownInfo, getCooldownColor } from '../utils/cooldownUtils';
import { formatCooldown } from '../utils/timeUtils';
import { CooldownIcon } from './CooldownIcon';

interface Props {
  cooldown: CooldownInfo;
}

export function CooldownLabel({ cooldown }: Props) {
  const color = useMemo(
    () => getCooldownColor(cooldown.minutes, cooldown.lastTimestamp, cooldown.type),
    [
      cooldown,
    ],
  );

  return (
    <View style={styles.row}>
      <CooldownIcon color={color} />
      <Text
        style={[
          styles.text,
          {
            color,
          },
        ]}
      >
        {formatCooldown(cooldown.minutes)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
