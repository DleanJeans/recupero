import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { BackButton } from '../../components/back-button';
import { CooldownBar } from '../../components/cooldown-bar';
import { DecayBar } from '../../components/decay-bar';
import { EditableIconTile } from '../../components/editable-icon-tile';
import { StarRow } from '../../components/star-row';
import { Text } from '../../components/text';
import { XPBar } from '../../components/xp-bar';
import { useBehaviorStore } from '../../store/behavior-store';
import { useSettingsStore } from '../../store/settings-store';
import type { BehaviorEntry } from '../../types/behavior';
import { getBehaviorTypeColor } from '../../utils/behavior-type-utils';
import { Colors } from '../../utils/colors';
import { isCooldownActive } from '../../utils/cooldown-utils';
import { toDateString } from '../../utils/date-utils';
import { iconText } from '../../utils/icon-utils';
import { getStarLogCountSummary, getThresholds } from '../../utils/star-utils';
import { formatElapsedNumeric } from '../../utils/time-utils';
import { getEffectiveXp, getLevel, getLevelProgress, getLevelXp, getXpToNextLevel } from '../../utils/xp-utils';

const CARD_LAYOUT = LinearTransition.duration(220);

interface Props {
  behavior: BehaviorEntry;
  titleOverride?: string;
  xpMotionEnabled?: boolean;
  showCurrentHabitXpLabel?: boolean;
  starMotionEnabled?: boolean;
  onBack?: () => void;
}

/** Behaviour screen header: back button, icon tile, name + category, and a
 *  stats card that folds into one row of labelled chips (default) or
 *  unfolds into labelled XP / cooldown / decay / star rows. */
export function BehaviorHeader({
  behavior,
  titleOverride,
  xpMotionEnabled = false,
  showCurrentHabitXpLabel = false,
  starMotionEnabled = false,
  onBack,
}: Props) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const hideCategoryNames = useSettingsStore(s => s.hideCategoryNames);
  const expanded = useSettingsStore(s => s.behaviorHeaderExpanded);
  const setExpanded = useSettingsStore(s => s.setBehaviorHeaderExpanded);
  const updateBehavior = useBehaviorStore(s => s.updateBehavior);
  const category = useBehaviorStore(s =>
    behavior.categoryId ? s.categories.find(c => c.id === behavior.categoryId) : undefined,
  );
  const [, setTick] = useState(0);

  // Re-render every minute so cooldown / decay / elapsed stay current.
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const effectiveXp = getEffectiveXp(behavior, now, dayCutoffHour);
  const todayStr = toDateString(new Date(now), dayCutoffHour);
  const starSummary = useMemo(
    () => getStarLogCountSummary(behavior, todayStr, todayStr, dayCutoffHour),
    [behavior, dayCutoffHour, todayStr],
  );

  const color = getBehaviorTypeColor(behavior.type);
  const name = titleOverride ?? behavior.name;
  const hasStars = getThresholds(behavior) != null;
  const cooldownActive = isCooldownActive(behavior);
  const hasLastLog = behavior.lastTimestamp != null;
  const showDecay = behavior.xpEnabled && behavior.xpDecay && effectiveXp > 0;
  const hasStats = behavior.xpEnabled || hasStars || hasLastLog;

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <BackButton onPress={onBack} />
        <EditableIconTile
          value={behavior.icon}
          fallback="⏱️"
          size={44}
          radius={13}
          emojiSize={26}
          style={styles.iconTile}
          nameHint={behavior.name}
          onChange={icon => updateBehavior(behavior.id, { icon })}
        />
        <View style={styles.titleColumn}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {name}
            {!behavior.xpEnabled && <Text style={styles.logCount}> ×{behavior.logs.length}</Text>}
          </Text>
          {category && (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
            >
              {iconText(category.emoji)}
              {hideCategoryNames ? '' : ` ${category.name}`}
            </Text>
          )}
        </View>
      </View>

      {hasStats && (
        <Animated.View
          layout={CARD_LAYOUT}
          style={styles.card}
        >
          <Pressable
            onPress={() => setExpanded(!expanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? 'Hide habit details' : 'Show habit details'}
            style={styles.cardPress}
          >
            {expanded ? (
              <Animated.View
                key="expanded"
                entering={FadeIn.duration(180)}
                style={styles.expanded}
              >
                {behavior.xpEnabled && (
                  <XPBar
                    xp={effectiveXp}
                    color={color}
                    label={showCurrentHabitXpLabel && behavior.xpDecay ? 'Current Habit XP' : 'Habit XP'}
                    animateNumbers={xpMotionEnabled}
                    motionEnabled={xpMotionEnabled}
                  />
                )}
                {hasLastLog && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{cooldownActive ? 'Cooldown' : 'Last logged'}</Text>
                    <CooldownBar
                      behavior={behavior}
                      now={now}
                    />
                  </View>
                )}
                {showDecay && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Decay</Text>
                    <DecayBar
                      behavior={behavior}
                      now={now}
                    />
                  </View>
                )}
                {hasStars && (
                  <View style={styles.starsRow}>
                    <Text style={styles.sectionLabel}>Stars</Text>
                    <View style={styles.starsValue}>
                      <StarRow
                        behavior={behavior}
                        size={14}
                        motionEnabled={starMotionEnabled}
                      />
                      {starSummary && <Text style={styles.starText}>{starSummary}</Text>}
                    </View>
                  </View>
                )}
              </Animated.View>
            ) : (
              <Animated.View
                key="collapsed"
                entering={FadeIn.duration(180)}
                style={styles.chips}
              >
                {behavior.xpEnabled && (
                  <XpChip
                    xp={effectiveXp}
                    color={color}
                  />
                )}
                {hasStars && (
                  <View style={styles.chip}>
                    <StarRow
                      behavior={behavior}
                      size={12}
                      motionEnabled={starMotionEnabled}
                    />
                    {starSummary && <Text style={[styles.chipText, styles.starChipText]}>{starSummary}</Text>}
                  </View>
                )}
                {cooldownActive ? (
                  <CooldownBar
                    behavior={behavior}
                    now={now}
                    variant="pill"
                  />
                ) : (
                  hasLastLog && (
                    <View style={styles.chip}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={Colors.text.muted}
                      />
                      <Text style={styles.chipText}>{formatElapsedNumeric(behavior.lastTimestamp, now)}</Text>
                    </View>
                  )
                )}
                {showDecay && (
                  <DecayBar
                    behavior={behavior}
                    now={now}
                    variant="pill"
                  />
                )}
              </Animated.View>
            )}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.text.muted}
              style={styles.caret}
            />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

/** Pure: "Lv0 ▬▬── 10/25" chip. */
function XpChip({ xp, color }: { xp: number; color: string }) {
  const level = getLevel(xp);
  const currentXp = getLevelXp(xp);
  const levelXp = currentXp + getXpToNextLevel(xp);
  return (
    <View
      style={styles.chip}
      accessibilityLabel={`Level ${level}, ${currentXp} of ${levelXp} XP`}
    >
      <Text style={styles.chipStrong}>Lv{level}</Text>
      <View style={styles.miniTrack}>
        <View style={[styles.miniFill, { backgroundColor: color, width: `${getLevelProgress(xp) * 100}%` }]} />
      </View>
      <Text style={styles.chipText}>
        {currentXp}/{levelXp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconTile: {
    backgroundColor: Colors.bg.card,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  logCount: {
    color: Colors.text.faint,
    fontSize: 15,
    fontWeight: '400',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 1,
  },
  card: {
    marginHorizontal: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardPress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  caret: {
    paddingTop: 5,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: Colors.bg.input,
  },
  chipStrong: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipText: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  starChipText: {
    color: Colors.star.filled,
  },
  miniTrack: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.default,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  expanded: {
    flex: 1,
    gap: 10,
  },
  section: {
    gap: 2,
  },
  sectionLabel: {
    color: Colors.text.faint,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.default,
  },
  starsValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starText: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
