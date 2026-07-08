import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../store/settings-store';
import type { BehaviorEntry } from '../types/behavior';
import { getBehaviorTypeColor } from '../utils/behavior-type-utils';
import { Colors } from '../utils/colors';
import { isCooldownActive } from '../utils/cooldown-utils';
import { toDateString } from '../utils/date-utils';
import {
  getLogCountForPeriod,
  getNextStarThreshold,
  getStarPeriod,
  getStarPeriodLogCountLabel,
  getThresholds,
} from '../utils/star-utils';
import { getEffectiveXp } from '../utils/xp-utils';
import { AutoFitHeaderTitle } from './auto-fit-header-title';
import { BehaviorElapsed } from './behavior-elapsed';
import { BehaviorIcon } from './behavior-icon';
import { CategoryEmoji } from './category-emoji';
import { CooldownBar } from './cooldown-bar';
import { DecayBar } from './decay-bar';
import { StarRow } from './star-row';
import { Text } from './text';
import { XPBar } from './xp-bar';

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
  motionEnabled?: boolean;
  xpMotionEnabled?: boolean;
  showCurrentHabitXpLabel?: boolean;
  starMotionEnabled?: boolean;
  now?: number;
  inlineElapsedWhenNoCooldown?: boolean;
}

/** Body for the home card and the BehaviorDetails/BehaviorLog headers:
 *  icon column + info section (name, XPBar, CooldownBar, DecayBar).
 *  Card and headers use the same body — the only difference is the title
 *  font size, controlled by `titleSize`. */
export const BehaviorSummary = React.memo(function BehaviorSummary({
  behavior,
  showCategory,
  dateStr,
  titleOverride,
  titleSize = 'card',
  motionEnabled = true,
  xpMotionEnabled = false,
  showCurrentHabitXpLabel = false,
  starMotionEnabled = false,
  now,
  inlineElapsedWhenNoCooldown = false,
}: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const [tick, setTick] = useState(0);
  const resolvedNow = now ?? Date.now();

  // Re-render every minute so "2h ago" / CooldownBar stay current.
  useEffect(() => {
    if (now != null) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [now]);

  const isHeader = titleSize === 'header';
  const effectiveXp = useMemo(
    () => getEffectiveXp(behavior, resolvedNow, dayCutoffHour),
    [behavior, dayCutoffHour, resolvedNow, tick],
  );
  const behaviorColor = useMemo(() => getBehaviorTypeColor(behavior.type), [behavior.type]);
  const todayStr = useMemo(
    () => toDateString(new Date(resolvedNow), dayCutoffHour),
    [dayCutoffHour, resolvedNow, tick],
  );
  const starTargetDate = dateStr ?? todayStr;
  const starLogCountSummary = useMemo(() => {
    const thresholds = getThresholds(behavior);
    if (!thresholds) return null;

    const starPeriod = getStarPeriod(behavior);
    const logCount = getLogCountForPeriod(behavior, starPeriod, starTargetDate, dayCutoffHour);
    const nextThreshold = getNextStarThreshold(logCount, thresholds);
    if (nextThreshold == null) return null;

    const lastLogDateStr =
      behavior.lastTimestamp == null ? null : toDateString(new Date(behavior.lastTimestamp), dayCutoffHour);
    const periodLabel = getStarPeriodLogCountLabel(starPeriod, lastLogDateStr, todayStr);
    const progressLabel = `${logCount}/${nextThreshold}`;
    return periodLabel ? `${periodLabel}: ${progressLabel}` : progressLabel;
  }, [behavior, dayCutoffHour, starTargetDate, todayStr]);

  const elapsedOnly = inlineElapsedWhenNoCooldown && !isCooldownActive(behavior);

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
          motionEnabled={starMotionEnabled}
        />
        {starLogCountSummary && <Text style={styles.starLogCount}>{starLogCountSummary}</Text>}
      </View>
      <View style={styles.info}>
        <BehaviorTitle
          behavior={behavior}
          showCategory={showCategory}
          titleOverride={titleOverride}
          titleSize={isHeader ? 'header' : 'card'}
          inlineElapsed={
            elapsedOnly ? (
              <View style={styles.inlineElapsed}>
                <BehaviorElapsed
                  behavior={behavior}
                  now={resolvedNow}
                />
              </View>
            ) : undefined
          }
        />
        {behavior.xpEnabled && (
          <XPBar
            xp={effectiveXp}
            color={behaviorColor}
            label={showCurrentHabitXpLabel && behavior.xpDecay ? 'Current Habit XP' : undefined}
            animateNumbers={xpMotionEnabled}
            motionEnabled={xpMotionEnabled}
          />
        )}
        {!elapsedOnly && (
          <View style={styles.elapsedRow}>
            <CooldownBar
              behavior={behavior}
              motionEnabled={motionEnabled}
              now={resolvedNow}
            />
          </View>
        )}
        {behavior.xpEnabled && behavior.xpDecay && effectiveXp > 0 && (
          <DecayBar
            behavior={behavior}
            motionEnabled={motionEnabled}
            now={resolvedNow}
          />
        )}
      </View>
    </View>
  );
});

interface BehaviorTitleProps {
  behavior: BehaviorEntry;
  showCategory?: boolean;
  titleOverride?: string;
  titleSize?: 'card' | 'header';
  /** When provided, rendered on the same line as the card-variant name. */
  inlineElapsed?: React.ReactNode;
}

function BehaviorTitle({ behavior, showCategory, titleOverride, titleSize = 'card', inlineElapsed }: BehaviorTitleProps) {
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
      {inlineElapsed}
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
  inlineElapsed: {
    color: Colors.text.muted,
    fontSize: 10,
    marginLeft: 'auto',
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
