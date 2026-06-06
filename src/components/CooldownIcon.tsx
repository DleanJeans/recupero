import { Ionicons } from '@expo/vector-icons';
import React from 'react';

interface Props {
  size?: number;
  color?: string;
}

export function CooldownIcon({ size = 14, color = '#888' }: Props) {
  return (
    <Ionicons
      name="timer-outline"
      size={size}
      color={color}
    />
  );
}
