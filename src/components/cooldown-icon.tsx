import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Colors } from '../utils/colors';

interface Props {
  size?: number;
  color?: string;
}

export function CooldownIcon({ size = 14, color = Colors.text.muted }: Props) {
  return (
    <Ionicons
      name="battery-charging"
      size={size}
      color={color}
    />
  );
}
