import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Colors } from '../utils/colors';

interface Props {
  size?: number;
  color?: string;
}

export function CooldownIcon({ size = 14, color = Colors.textMuted }: Props) {
  return (
    <Ionicons
      name="timer-outline"
      size={size}
      color={color}
    />
  );
}
