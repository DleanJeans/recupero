import React from 'react';
import { Text } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';

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
  return <Text style={{ fontSize: size }}>{emoji}</Text>;
});
