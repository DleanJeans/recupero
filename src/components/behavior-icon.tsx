import React from 'react';
import { Image } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Text } from './text';

interface Props {
  behavior: BehaviorEntry;
  size?: number;
}

export function BehaviorIcon({ behavior, size = 32 }: Props) {
  const { icon } = behavior;

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
