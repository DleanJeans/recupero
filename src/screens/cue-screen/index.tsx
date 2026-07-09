import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text, TextInput } from '../../components/text';
import { TimePicker } from '../../components/time-picker';
import { useCueStore } from '../../store/cue-store';
import type { EnergyLevel, LocationCue, MoodCue } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { CueChipGroup } from './components/cue-chip-group';
import { CueLogList } from './components/cue-log-list';
import { CueSection } from './components/cue-section';

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [expandedTimePicker, setExpandedTimePicker] = useState<'bedtime' | 'wakeUp' | null>(null);
  const energyLevel = useCueStore(s => s.energyLevel);
  const mood = useCueStore(s => s.mood);
  const location = useCueStore(s => s.location);
  const homeName = useCueStore(s => s.homeName);
  const bedtime = useCueStore(s => s.bedtime);
  const wakeUpTime = useCueStore(s => s.wakeUpTime);
  const cueLogs = useCueStore(s => s.cueLogs);
  const setEnergyLevel = useCueStore(s => s.setEnergyLevel);
  const setMood = useCueStore(s => s.setMood);
  const setLocation = useCueStore(s => s.setLocation);
  const setHomeName = useCueStore(s => s.setHomeName);
  const setBedtime = useCueStore(s => s.setBedtime);
  const setWakeUpTime = useCueStore(s => s.setWakeUpTime);
  const bedtimeParts = parseTimeParts(bedtime);
  const wakeUpParts = parseTimeParts(wakeUpTime);

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
              <TimePicker
                label="Bedtime"
                hour={bedtimeParts.hour}
                minute={bedtimeParts.minute}
                maxHour={23}
                maxMinute={59}
                collapsed={expandedTimePicker !== 'bedtime'}
                onMinuteChange={minuteOffset => setBedtime(formatPickerTime(bedtimeParts.hour, minuteOffset))}
                onExpand={() => setExpandedTimePicker('bedtime')}
              />
            </View>
            <View style={styles.timeField}>
              <TimePicker
                label="Wake up"
                hour={wakeUpParts.hour}
                minute={wakeUpParts.minute}
                maxHour={23}
                maxMinute={59}
                collapsed={expandedTimePicker !== 'wakeUp'}
                onMinuteChange={minuteOffset => setWakeUpTime(formatPickerTime(wakeUpParts.hour, minuteOffset))}
                onExpand={() => setExpandedTimePicker('wakeUp')}
              />
            </View>
          </View>
        </CueSection>

        <CueSection title="Behavior triggers">
          <Button
            variant="secondary"
            onPress={() => navigation.navigate('CueTriggers')}
          >
            Manage triggers
          </Button>
        </CueSection>

        <CueLogList logs={cueLogs} />
      </ScrollView>
    </SafeAreaView>
  );
}

function parseTimeParts(value: string) {
  const [rawHour, rawMinute] = value.split(':');
  return {
    hour: clampTimePart(Number(rawHour), 23),
    minute: clampTimePart(Number(rawMinute), 59),
  };
}

function clampTimePart(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function formatPickerTime(currentHour: number, minuteOffset: number) {
  const totalMinutes = currentHour * 60 + minuteOffset;
  return formatTime(Math.floor(totalMinutes / 60), totalMinutes % 60);
}

function formatTime(hour: number, minute: number) {
  return `${String(clampTimePart(hour, 23)).padStart(2, '0')}:${String(clampTimePart(minute, 59)).padStart(2, '0')}`;
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
});
