import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import type { BehaviorEntry } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behaviorTypeUtils';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/dateUtils';
import {
  getLogCountForPeriod,
  getNextStarThreshold,
  getStarPeriod,
  getStarPeriodLogCountLabel,
  getThresholds,
} from '../utils/starUtils';
import { getEffectiveXp } from '../utils/xpUtils';
import { AutoFitHeaderTitle } from './AutoFitHeaderTitle';
import { BehaviorIcon } from './BehaviorIcon';
import { CategoryEmoji } from './CategoryEmoji';
import { CooldownBar } from './CooldownBar';
import { DecayBar } from './DecayBar';
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

/** Body for the home card and the BehaviorDetails/BehaviorLog headers:
 *  icon column + info section (name, XpBar, CooldownBar, DecayBar).
 *  Card and headers use the same body — the only difference is the title
 *  font size, controlled by `titleSize`. */
export const BehaviorSummary = React.memo(function BehaviorSummary({
  behavior,
  showCategory,
  dateStr,
  titleOverride,
  titleSize = 'card',
}: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const [tick, setTick] = useState(0);

  // Re-render every minute so "2h ago" / CooldownBar stay current.
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isHeader = titleSize === 'header';
  const effectiveXp = useMemo(
    () => getEffectiveXp(behavior, Date.now(), dayCutoffHour),
    [behavior, dayCutoffHour, tick],
  );
  const behaviorColor = useMemo(() => getBehaviorTypeColor(behavior.type), [behavior.type]);
  const todayStr = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour, tick]);
  const starTargetDate = dateStr ?? todayStr;
  const starLogCountSummary = useMemo(() => {
    const thresholds = getThresholds(behavior);
    if (!thresholds) return null;

    const starPeriod = getStarPeriod(behavior);
    const logCount = getLogCountForPeriod(behavior, starPeriod, starTargetDate, dayCutoffHour);
    const nextThreshold = getNextStarThreshold(logCount, thresholds);
    if (nextThreshold == null) return null;

    const periodLabel = getStarPeriodLogCountLabel(starPeriod, starTargetDate, todayStr);
    return `${periodLabel}: ${logCount}/${nextThreshold}`;
  }, [behavior, dayCutoffHour, starTargetDate, todayStr]);

  return (
    <View style={styles.body}>
      <View style={styles.iconColumn}>
        <BehaviorIcon
          behavior={behavior}
          size={isHeader ? 24 : 32}
        />
        <StarRow
          behavior={behavior}
          dateStr={starTargetDate}
          size={11}
        />
        {starLogCountSummary && <Text style={styles.starLogCount}>{starLogCountSummary}</Text>}
      </View>
      <View style={styles.info}>
        <BehaviorTitle
          behavior={behavior}
          showCategory={showCategory}
          titleOverride={titleOverride}
          titleSize={isHeader ? 'header' : 'card'}
        />
        {behavior.xpEnabled && (
          <XpBar
            xp={effectiveXp}
            color={behaviorColor}
            animateNumbers
          />
        )}
        <View style={styles.elapsedRow}>
          <CooldownBar behavior={behavior} />
        </View>
        {behavior.xpEnabled && behavior.xpDecay && effectiveXp > 0 && <DecayBar behavior={behavior} />}
      </View>
    </View>
  );
});

interface BehaviorTitleProps {
  behavior: BehaviorEntry;
  showCategory?: boolean;
  titleOverride?: string;
  titleSize?: 'card' | 'header';
}

function BehaviorTitle({ behavior, showCategory, titleOverride, titleSize = 'card' }: BehaviorTitleProps) {
  const name = titleOverride ?? behavior.name;
  if (titleSize === 'header') {
    return (
      <AutoFitHeaderTitle
        name={name}
        style={styles.headerTitle}
      >
        {' '}
        {showCategory && (
          <CategoryEmoji
            behavior={behavior}
            size={22}
          />
        )}
        {!behavior.xpEnabled && <Text style={styles.headerLogCount}> ×{behavior.logs.length}</Text>}
      </AutoFitHeaderTitle>
    );
  }
  return (
    <View style={styles.nameRow}>
      <Text style={styles.name}>{name}</Text>
      {showCategory && <CategoryEmoji behavior={behavior} />}
      {!behavior.xpEnabled && <Text style={styles.logCount}>×{behavior.logs.length}</Text>}
    </View>
  );
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
  starLogCount: {
    color: Colors.text.muted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    textAlign: 'center',
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
});
