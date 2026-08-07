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
  presentation?: 'default' | 'home-card';
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
  presentation = 'default',
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
  const isHomeCard = presentation === 'home-card';
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
  const inlineElapsed =
    isHomeCard || elapsedOnly ? (
      <View style={styles.inlineElapsed}>
        <BehaviorElapsed
          behavior={behavior}
          now={resolvedNow}
        />
      </View>
    ) : undefined;

  return (
    <View style={[styles.body, isHomeCard && styles.cardBody]}>
      <View style={[styles.iconColumn, isHomeCard && styles.cardIconColumn]}>
        {isHomeCard ? (
          <View style={styles.cardIconShell}>
            <BehaviorIcon
              behavior={behavior}
              size={26}
            />
          </View>
        ) : (
          <BehaviorIcon
            behavior={behavior}
            size={isHeader ? 24 : 32}
          />
        )}
        <StarRow
          behavior={behavior}
          dateStr={starTargetDate}
          size={isHomeCard ? 13 : 11}
          motionEnabled={starMotionEnabled}
        />
        {starLogCountSummary && <Text style={styles.starLogCount}>{starLogCountSummary}</Text>}
      </View>
      <View style={[styles.info, isHomeCard && styles.cardInfo]}>
        <BehaviorTitle
          behavior={behavior}
          showCategory={showCategory}
          titleOverride={titleOverride}
          titleSize={isHeader ? 'header' : 'card'}
          presentation={presentation}
          inlineElapsed={inlineElapsed}
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
        {isHomeCard ? (
          (isCooldownActive(behavior) || (behavior.xpEnabled && behavior.xpDecay && effectiveXp > 0)) && (
            <View style={styles.cardStatusRow}>
              {isCooldownActive(behavior) && (
                <CooldownBar
                  behavior={behavior}
                  motionEnabled={motionEnabled}
                  now={resolvedNow}
                  variant="pill"
                />
              )}
              {behavior.xpEnabled && behavior.xpDecay && effectiveXp > 0 && (
                <DecayBar
                  behavior={behavior}
                  motionEnabled={motionEnabled}
                  now={resolvedNow}
                  variant="pill"
                />
              )}
            </View>
          )
        ) : (
          <>
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
          </>
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
  presentation?: 'default' | 'home-card';
  /** When provided, rendered on the same line as the card-variant name. */
  inlineElapsed?: React.ReactNode;
}

function BehaviorTitle({
  behavior,
  showCategory,
  titleOverride,
  titleSize = 'card',
  presentation = 'default',
  inlineElapsed,
}: BehaviorTitleProps) {
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
    <View style={[styles.nameRow, presentation === 'home-card' && styles.cardNameRow]}>
      <Text style={[styles.name, presentation === 'home-card' && styles.cardName]}>{name}</Text>
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
  cardBody: {
    gap: 13,
  },
  iconColumn: {
    alignItems: 'center',
    gap: 5,
  },
  cardIconColumn: {
    width: 46,
    gap: 6,
  },
  cardIconShell: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
    borderRadius: 13,
  },
  info: {
    flex: 1,
  },
  cardInfo: {
    minWidth: 0,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardNameRow: {
    minWidth: 0,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
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
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
});
