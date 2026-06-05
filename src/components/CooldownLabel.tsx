import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getCooldownColor } from '../utils/cooldownUtils';
import { formatCooldown } from '../utils/timeUtils';
import { CooldownIcon } from './CooldownIcon';

interface Props {
  minutes: number;
  lastTimestamp?: number | null;
}

export function CooldownLabel({ minutes, lastTimestamp }: Props) {
  const color = useMemo(
    () => getCooldownColor(minutes, lastTimestamp),
    [
      minutes,
      lastTimestamp,
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
        {formatCooldown(minutes)}
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
