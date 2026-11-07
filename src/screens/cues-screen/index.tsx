import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { type AddCueOptionKind, AddCueOptionModal } from '../../components/cues/add-cue-option-modal';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { CueSegmentedControl } from '../../components/cues/cue-segmented-control';
import { NeedsPanel } from '../../components/needs/needs-panel';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useCustomCueOptions } from '../../hooks/use-custom-cue-options';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCuesStore } from '../../store/cues-store';
import type { CueSourceKind, CueTriggerType } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  CUE_TRIGGER_TYPES,
  type CueSource,
  getBodySensationOption,
  getCueSources,
  getCueXpStats,
  getCurrentMood,
  getMoodOption,
  getRecentBodySensation,
} from '../../utils/cue-utils';
import { ActivityPreview } from './components/activity-preview';
import { CueCard } from './components/cue-card';
import { CueSourceRow } from './components/cue-source-row';
import { ReminderStatusNotice } from './components/reminder-status-notice';

type CuesTab = 'cues' | 'reminders';

const TABS: ReadonlyArray<{ value: CuesTab; label: string }> = [
  { value: 'cues', label: 'Cues' },
  { value: 'reminders', label: 'Reminders' },
];

const TRIGGER_LABELS: Record<CueTriggerType, string> = {
  location: 'Location',
  time: 'Time',
  habit: 'Habit',
  mood: 'Mood',
  body: 'Body',
};

const EMPTY_STATS = { xp: 0, logCount: 0 };

export function CuesScreen() {
  const [tab, setTab] = useState<CuesTab>('cues');

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Cues" />
      <View style={styles.tabs}>
        <CueSegmentedControl
          value={tab}
          options={TABS}
          onChange={setTab}
        />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {tab === 'cues' ? <CueSourcesTab /> : <RemindersTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function CueSourcesTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const places = useCuesStore(state => state.places);
  const moodLogs = useCuesStore(state => state.moodLogs);
  const bodyLogs = useCuesStore(state => state.bodyLogs);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const custom = useCustomCueOptions();
  const [adding, setAdding] = useState<AddCueOptionKind>();
  const currentMood = getCurrentMood(moodLogs);
  const recentBody = getRecentBodySensation(bodyLogs);

  const stats = useMemo(() => getCueXpStats(behaviors), [behaviors]);
  const sources = useMemo(() => getCueSources(places, custom), [places, custom]);
  const maxXp = useMemo(() => Math.max(0, ...sources.map(source => stats.get(source.ref)?.xp ?? 0)), [sources, stats]);
  const byKind = useMemo(() => {
    const sorted = (kind: CueSourceKind) =>
      sources
        .filter(source => source.kind === kind)
        // Stable sort keeps the default order for cues with equal XP.
        .sort((a, b) => (stats.get(b.ref)?.xp ?? 0) - (stats.get(a.ref)?.xp ?? 0));
    return { place: sorted('place'), mood: sorted('mood'), body: sorted('body') };
  }, [sources, stats]);

  const openSource = (source: CueSource) => {
    if (source.kind === 'place') {
      navigation.navigate('LocationEdit', { placeId: source.ref.slice('place:'.length) });
    } else if (source.kind === 'mood') {
      navigation.navigate('MoodLog');
    } else {
      navigation.navigate('BodyLog');
    }
  };

  const renderRows = (list: CueSource[]) =>
    list.map(source => (
      <CueSourceRow
        key={source.ref}
        source={source}
        stats={stats.get(source.ref) ?? EMPTY_STATS}
        maxXp={maxXp}
        onPress={() => openSource(source)}
      />
    ));

  return (
    <>
      <NeedsPanel />

      <Text style={styles.hint}>XP from behaviours you logged with each cue. Pick cues on the log screen.</Text>

      <View style={styles.group}>
        <SectionHeader
          label="Places"
          action="Manage"
          onAction={() => navigation.navigate('SavedPlaces')}
        />
        {byKind.place.length > 0 ? (
          renderRows(byKind.place)
        ) : (
          <Pressable
            style={({ pressed }) => [styles.emptyRow, pressed && styles.pressed]}
            onPress={() => navigation.navigate('LocationEdit')}
            accessibilityRole="button"
          >
            <Text style={styles.emptyRowText}>No saved places yet. Add one</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.group}>
        <SectionHeader
          label="Moods"
          detail={currentMood ? `Now ${getMoodOption(currentMood.mood, custom.moods).emoji}` : undefined}
          action="Log mood"
          onAction={() => navigation.navigate('MoodLog')}
        />
        {renderRows(byKind.mood)}
        <AddRow
          label="Add a mood"
          onPress={() => setAdding('mood')}
        />
      </View>

      <View style={styles.group}>
        <SectionHeader
          label="Body"
          detail={
            recentBody ? `Now ${getBodySensationOption(recentBody.sensation, custom.sensations).emoji}` : undefined
          }
          action="Log sensation"
          onAction={() => navigation.navigate('BodyLog')}
        />
        {renderRows(byKind.body)}
        <AddRow
          label="Add a body sensation"
          onPress={() => setAdding('body')}
        />
      </View>

      <AddCueOptionModal
        kind={adding}
        onClose={() => setAdding(undefined)}
      />
    </>
  );
}

interface AddRowProps {
  label: string;
  onPress: () => void;
}

function AddRow({ label, onPress }: AddRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.emptyRow, styles.addRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons
        name="add"
        size={16}
        color={Colors.text.muted}
      />
      <Text style={styles.emptyRowText}>{label}</Text>
    </Pressable>
  );
}

interface SectionHeaderProps {
  label: string;
  detail?: string;
  action: string;
  onAction: () => void;
}

function SectionHeader({ label, detail, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitle}>
        <CueSectionLabel>{label}</CueSectionLabel>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      <Pressable
        onPress={onAction}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function RemindersTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cues = useCuesStore(state => state.cues);
  const groupedCues = useMemo(
    () => CUE_TRIGGER_TYPES.map(type => ({ type, cues: cues.filter(cue => cue.trigger.type === type) })),
    [cues],
  );

  return (
    <>
      <ReminderStatusNotice />

      {cues.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No reminders yet</Text>
          <Text style={styles.emptyBody}>
            Save reminders that suggest behaviours for a place, time, habit, mood or body sensation. Place, time and
            habit reminders notify you when they fire.
          </Text>
        </View>
      ) : (
        groupedCues.map(group =>
          group.cues.length > 0 ? (
            <View
              key={group.type}
              style={styles.group}
            >
              <CueSectionLabel>{TRIGGER_LABELS[group.type]}</CueSectionLabel>
              {group.cues.map(cue => (
                <CueCard
                  key={cue.id}
                  cue={cue}
                />
              ))}
            </View>
          ) : null,
        )
      )}

      <ActivityPreview />
      <Button
        variant="primary"
        style={styles.cta}
        onPress={() => navigation.navigate('CueForm')}
      >
        New reminder
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  hint: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  notice: {
    color: Colors.text.muted,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    lineHeight: 17,
  },
  group: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  sectionDetail: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  sectionAction: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  emptyRowText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  emptyCard: {
    gap: 5,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 18,
  },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: Colors.text.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  cta: {
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.7,
  },
});
