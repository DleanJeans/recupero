import React from 'react';
import { Text } from 'react-native';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';

interface Props {
  behavior: BehaviorEntry;
  size?: number;
}

export function CategoryEmoji({ behavior, size = 15 }: Props) {
  const { categories } = useBehaviorStore();
  const category = behavior.categoryId ? categories.find(c => c.id === behavior.categoryId) : null;
  if (!category) return null;
  return <Text style={{ fontSize: size }}>{category.emoji}</Text>;
}
