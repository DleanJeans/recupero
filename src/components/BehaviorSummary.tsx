import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useXpBarAnimation } from '../hooks/useXpBarAnimation';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behaviorTypeUtils';
import { Colors } from '../utils/colors';
import { getEffectiveLogCount } from '../utils/xpUtils';
import { BehaviorIcon } from './BehaviorIcon';
import { CooldownBar } from './CooldownBar';
import { DecayBar } from './DecayBar';
import { ScreenTitle } from './ScreenTitle';
import { StarRow } from './StarRow';
import { XpBar } from './XpBar';

interface Props {
  behavior: BehaviorEntry;
  showCategory?: boolean;
  /** Date string (YYYY-MM-DD) for the section this body belongs to.
   *  When provided, the StarRow reflects earned stars for that date
   *  instead of today. Defaults to today. */
  dateStr?: string;
  /** Override the displayed name (e.g. "Edit Time" instead of behavior.name). */
  titleOverride?: string;
  /** 'card' (default) = 16px title (card variant).
   *  'header' = ScreenTitle-sized (28px bold) for screen headers. */
  titleSize?: 'card' | 'header';
}

/** Shared content for the home card and the BehaviorDetails/BehaviorLog
 *  headers: icon column + info section (name, XpBar, CooldownBar, DecayBar).
 *  Card and headers use the same body — the only difference is the title
 *  font size, controlled by `titleSize`. */
export function BehaviorSummary({ behavior, showCategory, dateStr, titleOverride, titleSize = 'card' }: Props) {
  const isFocused = useIsFocused();
  const animate = useXpBarAnimation(behavior, isFocused);
  const [, setTick] = useState(0);

  // Re-render every minute so "2h ago" / CooldownBar stay current.
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isHeader = titleSize === 'header';

  return (
    <View style={styles.body}>
      <View style={styles.iconColumn}>
        <BehaviorIcon
          behavior={behavior}
          size={isHeader ? 24 : 32}
        />
        {!isHeader && (
          <StarRow
            behavior={behavior}
            dateStr={dateStr}
            size={11}
          />
        )}
      </View>
      <View style={styles.info}>
        {isHeader ? (
          <HeaderName
            behavior={behavior}
            titleOverride={titleOverride}
          />
        ) : (
          <View style={styles.nameRow}>
            <Text style={styles.name}>{titleOverride ?? behavior.name}</Text>
            {showCategory && <CategoryEmoji behavior={behavior} />}
            {!behavior.xpEnabled && <Text style={styles.logCount}>×{behavior.logs.length}</Text>}
          </View>
        )}
        {behavior.xpEnabled && (
          <XpBar
            logCount={getEffectiveLogCount(behavior)}
            color={getBehaviorTypeColor(behavior.type)}
            animate={animate}
          />
        )}
        <View style={styles.elapsedRow}>
          <CooldownBar behavior={behavior} />
        </View>
        {behavior.xpEnabled && behavior.xpDecay && getEffectiveLogCount(behavior) > 0 && (
          <DecayBar behavior={behavior} />
        )}
      </View>
    </View>
  );
}

interface HeaderNameProps {
  behavior: BehaviorEntry;
  titleOverride?: string;
}
function HeaderName({ behavior, titleOverride }: HeaderNameProps) {
  const name = titleOverride ?? behavior.name;
  if (behavior.xpEnabled) {
    return <ScreenTitle style={styles.headerTitle}>{name}</ScreenTitle>;
  }
  return (
    <ScreenTitle style={styles.headerTitle}>
      {name}
      <Text style={styles.headerLogCount}> ×{behavior.logs.length}</Text>
    </ScreenTitle>
  );
}

function CategoryEmoji({ behavior }: { behavior: BehaviorEntry }) {
  const { categories } = useBehaviorStore();
  const category = behavior.categoryId ? categories.find(c => c.id === behavior.categoryId) : null;
  if (!category) return null;
  return <Text style={{ fontSize: 15 }}>{category.emoji}</Text>;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconColumn: {
    alignItems: 'center',
    gap: 5,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    paddingHorizontal: 0,
  },
  headerLogCount: {
    color: Colors.text.faint,
    fontSize: 16,
    fontWeight: '400',
  },
  logCount: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
});
