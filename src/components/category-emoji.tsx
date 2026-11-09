import React from 'react';
import { useBehaviorStore } from '../store/behavior-store';
import type { BehaviorEntry } from '../types/behavior';
import { AppIcon } from './app-icon';

interface Props {
  behavior: BehaviorEntry;
  size?: number;
}

export const CategoryEmoji = React.memo(function CategoryEmoji({ behavior, size = 15 }: Props) {
  const emoji = useBehaviorStore(s => {
    if (!behavior.categoryId) return null;
    return s.categories.find(c => c.id === behavior.categoryId)?.emoji ?? null;
  });

  if (!emoji) return null;
  return (
    <AppIcon
      value={emoji}
      size={size}
    />
  );
});
