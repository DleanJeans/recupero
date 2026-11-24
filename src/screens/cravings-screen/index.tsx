import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BehaviorActionSheet } from '../../components/behavior-action-sheet';
import { BehaviorIcon } from '../../components/behavior-icon';
import { UrgeEditDialog } from '../../components/cravings/urge-edit-dialog';
import { UrgeRow } from '../../components/cravings/urge-row';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { NeedsPanel } from '../../components/needs/needs-panel';
import { SafeAreaView } from '../../components/safe-area-view';
import { TabHeader } from '../../components/tab-header';
import { Text, TextInput } from '../../components/text';
import { type CopingUrgeItem, useCopingUrges } from '../../hooks/use-coping-urges';
import { useBehaviorActionSheetStore } from '../../store/behavior-action-sheet-store';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCravingsStore } from '../../store/cravings-store';
import { useSettingsStore } from '../../store/settings-store';
import type { BehaviorEntry, BehaviorType } from '../../types/behavior';
import type { CravingOutcome } from '../../types/craving';
import type { RootStackParamList } from '../../types/navigation';
import { getActiveBehaviors } from '../../utils/archive-utils';
import { capitalizeFirst } from '../../utils/behavior-group-utils';
import { Colors } from '../../utils/colors';
import { getCravingTone } from '../../utils/craving-tone';
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
import { StackBehaviorPickerModal } from '../behavior-screen/components/stack-behavior-picker-modal';
import { UrgesByNeed } from './components/urges-by-need';

export function CravingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const cravings = useCravingsStore(state => state.cravings);
  const view = useCravingsStore(state => state.view);
  const setView = useCravingsStore(state => state.setView);
  const addUrges = useCravingsStore(state => state.addUrges);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const { items: urgeItems, now: urgeNow } = useCopingUrges();
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [editingId, setEditingId] = useState<string>();

  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);
  const urgeIds = useMemo(() => urgeItems.map(item => item.urge.behaviorId), [urgeItems]);
  const unfinished = useMemo(
    () =>
      cravings
        .filter(craving => craving.outcome == null && behaviorById.has(craving.behaviorId))
        .sort((a, b) => b.startedAt - a.startedAt),
    [behaviorById, cravings],
  );
  // Undesirable behaviours (and ones craved before) that are not urges yet: offered when the Urges list is empty.
  const suggested = useMemo(
    () =>
      getCravableBehaviors(getActiveBehaviors(behaviors), cravings, hidePrivate).filter(b => !urgeIds.includes(b.id)),
    [behaviors, cravings, hidePrivate, urgeIds],
  );
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getActiveBehaviors(behaviors)
      .filter(behavior => (!hidePrivate || !behavior.private) && behavior.name.toLowerCase().includes(q))
      .sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
  }, [behaviors, hidePrivate, query]);
  const recent = useMemo(
    () => getRecentCravings(cravings).filter(craving => behaviorById.has(craving.behaviorId)),
    [behaviorById, cravings],
  );
  // The week line is about beating bad habits, so it only counts undesirable cravings.
  const stats = useMemo(() => {
    const undesirableIds = new Set(behaviors.filter(b => b.type === 'undesirable').map(b => b.id));
    return getCravingWeekStats(
      cravings.filter(craving => undesirableIds.has(craving.behaviorId)),
      behaviors,
    );
  }, [behaviors, cravings]);
  const [now, setNow] = useState(() => Date.now());
  const hasUnfinished = unfinished.length > 0;

  useEffect(() => {
    if (!hasUnfinished) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasUnfinished]);

  const ride = (behaviorId: string, cravingId?: string) => navigation.navigate('RideItOut', { behaviorId, cravingId });
  const logNow = (behaviorId: string) => navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log' });
  const editing = urgeItems.find(item => item.urge.behaviorId === editingId);

  const renderUrge = (item: CopingUrgeItem, showCopesFor = true) => (
    <UrgeRow
      key={item.urge.behaviorId}
      item={item}
      now={urgeNow}
      showCopesFor={showCopesFor}
      onPress={() => ride(item.urge.behaviorId)}
      onLongPress={() => setEditingId(item.urge.behaviorId)}
    />
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <TabHeader title="Cravings" />
      <BehaviorActionSheet />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {(stats.beaten > 0 || stats.gaveIn > 0) && (
          <Text
            style={styles.week}
            numberOfLines={1}
          >
            This week: <Text style={styles.beaten}>{stats.beaten} beaten</Text>
            {' · '}
            <Text style={styles.gaveIn}>{stats.gaveIn} gave in</Text>
          </Text>
        )}

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
          <View style={styles.sectionHeader}>
            <CueSectionLabel>Urges</CueSectionLabel>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setView(view === 'board' ? 'byNeed' : 'board')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change layout"
              >
                <View style={styles.toggle}>
                  <Ionicons
                    name={view === 'board' ? 'list-outline' : 'grid-outline'}
                    size={14}
                    color={Colors.text.light}
                  />
                  <Text
                    style={styles.action}
                    numberOfLines={1}
                  >
                    {view === 'board' ? 'Board' : 'By need'}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setPicking(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add coping behaviours"
              >
                <Text
                  style={styles.action}
                  numberOfLines={1}
                >
                  + Add
                </Text>
              </Pressable>
            </View>
          </View>
          {urgeItems.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>
                Add behaviours you use to cope. Each gets a bar that rises until you do it again, so you see a craving
                coming before it hits.
              </Text>
              {suggested.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.addAll, pressed && styles.pressed]}
                  onPress={() => addUrges(suggested.map(behavior => behavior.id))}
                  accessibilityRole="button"
                >
                  <Text
                    style={styles.addAllText}
                    numberOfLines={1}
                  >
                    Add {suggested.length} undesirable {suggested.length === 1 ? 'behaviour' : 'behaviours'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : view === 'board' ? (
            <View style={styles.card}>{urgeItems.map(item => renderUrge(item))}</View>
          ) : null}
        </View>

        {view === 'byNeed' && urgeItems.length > 0 ? (
          <UrgesByNeed
            items={urgeItems}
            behaviors={behaviors}
            renderUrge={renderUrge}
            onDo={logNow}
          />
        ) : (
          <NeedsPanel />
        )}

        <View style={styles.section}>
          <CueSectionLabel>Something else?</CueSectionLabel>
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
          {query.trim() !== '' && searched.length === 0 && (
            <Pressable
              style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}
              onPress={() => navigation.navigate('BehaviorForm', { defaultName: capitalizeFirst(query) })}
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
          )}
          {searched.map(behavior => {
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
          })}
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
                  <Text style={[styles.outcome, { color: getOutcomeColor(outcome, behavior.type) }]}>
                    {redirect ? `→ ${redirect.name}` : getCravingOutcomeLabel(outcome, behavior.type)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <StackBehaviorPickerModal
        visible={picking}
        excludeIds={urgeIds}
        onClose={() => setPicking(false)}
        onPickMany={ids => {
          addUrges(ids);
          setPicking(false);
        }}
      />
      {editing && (
        <UrgeEditDialog
          item={editing}
          onLogNow={() => {
            setEditingId(undefined);
            logNow(editing.urge.behaviorId);
          }}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </SafeAreaView>
  );
}

function getOutcomeColor(outcome: CravingOutcome, type: BehaviorType): string {
  if (isCravingLost(outcome, type)) return Colors.type.undesirable;
  if (type === 'undesirable') return Colors.type.desirable;
  return outcome === 'resisted' ? Colors.text.muted : getCravingTone(type).accent;
}

function formatWeekStats(stats: CravingWeekStats, type: BehaviorType): string {
  const parts = [`beaten ${stats.beaten}`];
  if (type === 'undesirable') parts.push(`gave in ${stats.gaveIn}`);
  else parts.push(`did it ${stats.didIt}`);
  if (type !== 'undesirable') parts[0] = `let pass ${stats.beaten}`;
  return `This week: ${parts.join(' · ')}`;
}

interface BehaviorRowProps {
  behavior: BehaviorEntry;
  detail: string;
  active?: boolean;
  onPress: () => void;
}

function BehaviorRow({ behavior, detail, active = false, onPress }: BehaviorRowProps) {
  const openActionSheet = useBehaviorActionSheetStore(state => state.open);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={() => openActionSheet(behavior.id)}
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
        name={active ? 'play-circle' : getCravingTone(behavior.type).listIcon}
        size={22}
        color={active ? Colors.text.secondary : getCravingTone(behavior.type).accent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 8 },
  week: { color: Colors.text.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  beaten: { color: Colors.type.desirable, fontWeight: '700' },
  gaveIn: { color: Colors.type.undesirable, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { color: Colors.text.light, fontSize: 12, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addAll: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.typeBtn.undesirable,
  },
  addAllText: { color: '#fecaca', fontSize: 13, fontWeight: '700' },
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
  empty: { color: Colors.text.faint, fontSize: 13, lineHeight: 19, paddingHorizontal: 4, paddingVertical: 8 },
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
});
