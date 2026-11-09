import React from 'react';
import type { BehaviorEntry } from '../types/behavior';
import { AppIcon } from './app-icon';

interface Props {
  behavior: BehaviorEntry;
  size?: number;
}

export function BehaviorIcon({ behavior, size = 32 }: Props) {
  return (
    <AppIcon
      value={behavior.icon}
      size={size}
      fallback="⏱️"
    />
  );
}
