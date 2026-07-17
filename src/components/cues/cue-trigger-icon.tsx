import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CueTriggerType } from '../../types/cue';
import { getCueAccent } from '../../utils/cue-utils';

const ICONS = {
  location: 'location-outline',
  time: 'time-outline',
  habit: 'link-outline',
  mood: 'happy-outline',
} as const;

interface CueTriggerIconProps {
  type: CueTriggerType;
  size?: number;
}

export function CueTriggerIcon({ type, size = 19 }: CueTriggerIconProps) {
  const accent = getCueAccent(type);
  return (
    <View style={[styles.icon, { backgroundColor: `${accent}1f` }]}>
      <Ionicons
        name={ICONS[type]}
        size={size}
        color={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
