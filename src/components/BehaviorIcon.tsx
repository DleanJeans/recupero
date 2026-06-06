import React from 'react';
import { Image, Text } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';

interface Props {
  icon: BehaviorEntry['icon'];
  size?: number;
}

export function BehaviorIcon({ icon, size = 32 }: Props) {
  if (icon && typeof icon === 'object') {
    return (
      <Image
        source={icon}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
        }}
      />
    );
  }

  return (
    <Text
      style={{
        fontSize: size,
      }}
    >
      {typeof icon === 'string' ? icon : '⏱️'}
    </Text>
  );
}
