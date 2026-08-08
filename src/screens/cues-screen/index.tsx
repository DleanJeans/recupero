import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useCuesStore } from '../../store/cues-store';
import type { CueTriggerType } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { CUE_TRIGGER_TYPES, getCurrentMood, getMoodOption } from '../../utils/cue-utils';
import { ActivityPreview } from './components/activity-preview';
import { CueCard } from './components/cue-card';
import { QuickTile } from './components/quick-tile';

const TRIGGER_LABELS: Record<CueTriggerType, string> = {
  location: 'Location',
  time: 'Time',
  habit: 'Habit',
  mood: 'Mood',
};

export function CuesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cues = useCuesStore(state => state.cues);
  const places = useCuesStore(state => state.places);
  const moodLogs = useCuesStore(state => state.moodLogs);
  const currentMood = getCurrentMood(moodLogs);
  const groupedCues = useMemo(
    () => CUE_TRIGGER_TYPES.map(type => ({ type, cues: cues.filter(cue => cue.trigger.type === type) })),
    [cues],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Cues" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.notice}>Automatic cue triggers and push reminders are unavailable in this build.</Text>
        <View style={styles.quickRow}>
          <QuickTile
            type="location"
            title="Saved places"
            subtitle={`${places.length} ${places.length === 1 ? 'place' : 'places'}`}
            onPress={() => navigation.navigate('SavedPlaces')}
          />
          <QuickTile
            type="mood"
            title="Mood"
            subtitle={
              currentMood
                ? `${getMoodOption(currentMood.mood).emoji} ${getMoodOption(currentMood.mood).label}`
                : 'Not set'
            }
            onPress={() => navigation.navigate('MoodLog')}
          />
        </View>

        {cues.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No cues yet</Text>
            <Text style={styles.emptyBody}>
              Save cue rules for manual suggestions. Automatic triggers are not available yet.
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
          New cue
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
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
});
