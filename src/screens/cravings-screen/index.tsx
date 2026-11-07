import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../components/behavior-icon';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCravingsStore } from '../../store/cravings-store';
import { useSettingsStore } from '../../store/settings-store';
import type { BehaviorEntry, BehaviorType } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  type CravingWeekStats,
  getCravableBehaviors,
  getCravingOutcomeLabel,
  getCravingWeekStats,
  getPeakUrge,
  getRecentCravings,
  getRideRemainingMs,
  isCravingLost,
} from '../../utils/craving-utils';
import { formatStopwatchDuration } from '../../utils/stopwatch-utils';
import { formatElapsedNumeric } from '../../utils/time-utils';

export function CravingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const cravings = useCravingsStore(state => state.cravings);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const [query, setQuery] = useState('');

  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);
  const unfinished = useMemo(
    () =>
      cravings
        .filter(craving => craving.outcome == null && behaviorById.has(craving.behaviorId))
        .sort((a, b) => b.startedAt - a.startedAt),
    [behaviorById, cravings],
  );
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return getCravableBehaviors(behaviors, cravings, hidePrivate);
    return behaviors
      .filter(behavior => (!hidePrivate || !behavior.private) && behavior.name.toLowerCase().includes(q))
      .sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
  }, [behaviors, cravings, hidePrivate, query]);
  const recent = useMemo(
    () => getRecentCravings(cravings).filter(craving => behaviorById.has(craving.behaviorId)),
    [behaviorById, cravings],
  );
  const stats = getCravingWeekStats(cravings, behaviors);
  const [now, setNow] = useState(() => Date.now());
  const hasUnfinished = unfinished.length > 0;

  useEffect(() => {
    if (!hasUnfinished) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasUnfinished]);

  const ride = (behaviorId: string, cravingId?: string) => navigation.navigate('RideItOut', { behaviorId, cravingId });

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Cravings" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stats}>
          <StatTile
            label="Beaten this week"
            value={stats.beaten}
            color={Colors.type.desirable}
          />
          <StatTile
            label="Gave in this week"
            value={stats.gaveIn}
            color={Colors.type.undesirable}
          />
        </View>

        {unfinished.length > 0 && (
          <View style={styles.section}>
            <CueSectionLabel>Riding out</CueSectionLabel>
            {unfinished.map(craving => {
              const behavior = behaviorById.get(craving.behaviorId) as BehaviorEntry;
              const remaining = getRideRemainingMs(craving, now);
              return (
                <BehaviorRow
                  key={craving.id}
                  behavior={behavior}
                  detail={remaining > 0 ? `${formatStopwatchDuration(remaining)} left` : 'Time is up · say how it went'}
                  active
                  onPress={() => ride(craving.behaviorId, craving.id)}
                />
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <CueSectionLabel>Feeling the pull?</CueSectionLabel>
          <View style={styles.search}>
            <Ionicons
              name="search"
              size={16}
              color={Colors.text.faint}
            />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="What do you want to do?"
              placeholderTextColor={Colors.text.faint}
              autoCorrect={false}
            />
          </View>
          {listed.length === 0 ? (
            query.trim() ? (
              <Pressable
                style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}
                onPress={() => navigation.navigate('BehaviorForm', { defaultName: query.trim() })}
                accessibilityRole="button"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={Colors.type.undesirable}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>Create "{query.trim()}"</Text>
                  <Text style={styles.detail}>No behaviour matches. Add it, then ride it out.</Text>
                </View>
              </Pressable>
            ) : (
              <Text style={styles.empty}>
                Undesirable behaviours show up here. Search to ride out a craving for anything else.
              </Text>
            )
          ) : (
            listed.map(behavior => {
              const behaviorStats = getCravingWeekStats(cravings, behaviors, Date.now(), behavior.id);
              const detail =
                behaviorStats.beaten || behaviorStats.gaveIn || behaviorStats.didIt
                  ? formatWeekStats(behaviorStats, behavior.type)
                  : behavior.lastTimestamp
                    ? `Last done ${formatElapsedNumeric(behavior.lastTimestamp)}`
                    : 'Not done yet';
              return (
                <BehaviorRow
                  key={behavior.id}
                  behavior={behavior}
                  detail={detail}
                  onPress={() => ride(behavior.id)}
                />
              );
            })
          )}
        </View>

        {recent.length > 0 && (
          <View style={styles.section}>
            <CueSectionLabel>Recent</CueSectionLabel>
            {recent.map(craving => {
              const behavior = behaviorById.get(craving.behaviorId) as BehaviorEntry;
              const redirect = craving.redirectBehaviorId ? behaviorById.get(craving.redirectBehaviorId) : undefined;
              const peak = getPeakUrge(craving);
              const outcome = craving.outcome ?? 'resisted';
              return (
                <View
                  key={craving.id}
                  style={styles.recentRow}
                >
                  <BehaviorIcon
                    behavior={behavior}
                    size={22}
                  />
                  <View style={styles.rowText}>
                    <Text
                      style={styles.recentName}
                      numberOfLines={1}
                    >
                      {behavior.name}
                    </Text>
                    <Text style={styles.detail}>
                      {formatElapsedNumeric(craving.startedAt)}
                      {peak ? ` · urge ${peak}/5` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.outcome, isCravingLost(outcome, behavior.type) ? styles.lost : styles.beaten]}>
                    {redirect ? `→ ${redirect.name}` : getCravingOutcomeLabel(outcome, behavior.type)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatWeekStats(stats: CravingWeekStats, type: BehaviorType): string {
  const parts = [`beaten ${stats.beaten}`];
  if (type === 'undesirable') parts.push(`gave in ${stats.gaveIn}`);
  else parts.push(`did it ${stats.didIt}`);
  return `This week: ${parts.join(' · ')}`;
}

interface StatTileProps {
  label: string;
  value: number;
  color: string;
}

function StatTile({ label, value, color }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
    </View>
  );
}

interface BehaviorRowProps {
  behavior: BehaviorEntry;
  detail: string;
  active?: boolean;
  onPress: () => void;
}

function BehaviorRow({ behavior, detail, active = false, onPress }: BehaviorRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ride out a craving for ${behavior.name}`}
    >
      <BehaviorIcon
        behavior={behavior}
        size={30}
      />
      <View style={styles.rowText}>
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {behavior.name}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Ionicons
        name={active ? 'play-circle' : 'flame-outline'}
        size={22}
        color={active ? Colors.type.desirable : Colors.type.undesirable}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 8 },
  stats: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  tileLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tileValue: { fontSize: 22, fontWeight: '700' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: 15, paddingVertical: 10 },
  empty: { color: Colors.text.faint, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
    padding: 12,
  },
  rowActive: { borderColor: Colors.status.success },
  pressed: { opacity: 0.75 },
  rowText: { flex: 1, gap: 2 },
  name: { color: Colors.text.primary, fontSize: 16, fontWeight: '600' },
  detail: { color: Colors.text.muted, fontSize: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingVertical: 4 },
  recentName: { color: Colors.text.secondary, fontSize: 14, fontWeight: '600' },
  outcome: { fontSize: 12, fontWeight: '600', maxWidth: 140 },
  beaten: { color: Colors.type.desirable },
  lost: { color: Colors.type.undesirable },
});
