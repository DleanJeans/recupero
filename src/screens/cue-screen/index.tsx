import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCueStore } from '../../store/cue-store';
import { useSettingsStore } from '../../store/settings-store';
import type { EnergyLevel, LocationCue, MoodCue } from '../../types/cue';
import { Colors } from '../../utils/colors';
import { CueChipGroup } from './components/cue-chip-group';
import { CueSection } from './components/cue-section';
import { CueTriggerComposer } from './components/cue-trigger-composer';
import { CueTriggerRuleCard } from './components/cue-trigger-rule-card';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ENERGY_OPTIONS = [
  { label: 'Low', value: 'low', icon: 'battery-dead-outline' },
  { label: 'Steady', value: 'steady', icon: 'battery-half-outline' },
  { label: 'High', value: 'high', icon: 'battery-full-outline' },
] satisfies Array<{ label: string; value: EnergyLevel; icon: IoniconName }>;

const MOOD_OPTIONS = [
  { label: 'Good', value: 'good', icon: 'happy-outline' },
  { label: 'Neutral', value: 'neutral', icon: 'remove-circle-outline' },
  { label: 'Rough', value: 'rough', icon: 'sad-outline' },
] satisfies Array<{ label: string; value: MoodCue; icon: IoniconName }>;

export function CueScreen() {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const energyLevel = useCueStore(s => s.energyLevel);
  const mood = useCueStore(s => s.mood);
  const location = useCueStore(s => s.location);
  const homeName = useCueStore(s => s.homeName);
  const bedtime = useCueStore(s => s.bedtime);
  const wakeUpTime = useCueStore(s => s.wakeUpTime);
  const triggerRules = useCueStore(s => s.triggerRules);
  const setEnergyLevel = useCueStore(s => s.setEnergyLevel);
  const setMood = useCueStore(s => s.setMood);
  const setLocation = useCueStore(s => s.setLocation);
  const setHomeName = useCueStore(s => s.setHomeName);
  const setBedtime = useCueStore(s => s.setBedtime);
  const setWakeUpTime = useCueStore(s => s.setWakeUpTime);
  const addTriggerRule = useCueStore(s => s.addTriggerRule);
  const toggleTriggerRule = useCueStore(s => s.toggleTriggerRule);
  const removeTriggerRule = useCueStore(s => s.removeTriggerRule);

  const visibleBehaviors = useMemo(() => {
    const filtered = hidePrivate ? behaviors.filter(behavior => !behavior.private) : behaviors;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, hidePrivate]);
  const locationOptions = useMemo(
    () =>
      [
        { label: homeName.trim() || 'Home', value: 'home', icon: 'home-outline' },
        { label: 'Outside', value: 'outside', icon: 'walk-outline' },
        { label: 'In bed', value: 'bed', icon: 'bed-outline' },
        { label: 'Other', value: 'other', icon: 'location-outline' },
      ] satisfies Array<{ label: string; value: LocationCue; icon: IoniconName }>,
    [homeName],
  );
  const visibleBehaviorNameById = useMemo(
    () => new Map(visibleBehaviors.map(behavior => [behavior.id, behavior.name])),
    [visibleBehaviors],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <ScreenTitle>Cues</ScreenTitle>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <CueSection title="Trackable">
          <CueChipGroup
            label="Energy"
            options={ENERGY_OPTIONS}
            value={energyLevel}
            onChange={setEnergyLevel}
          />
          <CueChipGroup
            label="Mood"
            options={MOOD_OPTIONS}
            value={mood}
            onChange={setMood}
          />
          <CueChipGroup
            label="Location"
            options={locationOptions}
            value={location}
            onChange={setLocation}
          />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Home name</Text>
            <TextInput
              style={styles.input}
              value={homeName}
              onChangeText={setHomeName}
              placeholder="Home"
              placeholderTextColor={Colors.text.faint}
            />
          </View>
        </CueSection>

        <CueSection title="Time">
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Bedtime</Text>
              <TextInput
                style={styles.input}
                value={bedtime}
                onChangeText={setBedtime}
                placeholder="22:30"
                placeholderTextColor={Colors.text.faint}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Wake up</Text>
              <TextInput
                style={styles.input}
                value={wakeUpTime}
                onChangeText={setWakeUpTime}
                placeholder="07:00"
                placeholderTextColor={Colors.text.faint}
              />
            </View>
          </View>
        </CueSection>

        <CueSection title="Behavior triggers">
          <CueTriggerComposer
            behaviors={visibleBehaviors}
            onAdd={(sourceBehaviorId, targetBehaviorId, delayMinutes) =>
              addTriggerRule({ sourceBehaviorId, targetBehaviorId, delayMinutes })
            }
          />
          <View style={styles.rules}>
            {triggerRules.length === 0 ? (
              <Text style={styles.empty}>No triggers saved.</Text>
            ) : (
              triggerRules.map(rule => (
                <CueTriggerRuleCard
                  key={rule.id}
                  rule={rule}
                  sourceName={visibleBehaviorNameById.get(rule.sourceBehaviorId) ?? 'Hidden behavior'}
                  targetName={visibleBehaviorNameById.get(rule.targetBehaviorId) ?? 'Hidden behavior'}
                  onToggle={() => toggleTriggerRule(rule.id)}
                  onRemove={() => removeTriggerRule(rule.id)}
                />
              ))
            )}
          </View>
        </CueSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
    gap: 8,
  },
  rules: {
    gap: 8,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 2,
  },
});
