import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { BehaviorIcon } from '../../components/behavior-icon';
import { Button } from '../../components/button';
import { CuePicker } from '../../components/cues/cue-picker';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCravingsStore } from '../../store/cravings-store';
import { useTimerStore } from '../../store/timer-store';
import type { CueRef } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getCravingWeekStats, getLatestUrge, getRideRemainingMs } from '../../utils/craving-utils';
import { CravingAlternatives } from './components/craving-alternatives';
import { RideCountdown } from './components/ride-countdown';
import { UrgeScale } from './components/urge-scale';

export function RideItOutScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RideItOut'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId } = route.params;
  const behavior = useBehaviorStore(useCallback(state => state.behaviors.find(b => b.id === behaviorId), [behaviorId]));
  const [cravingId, setCravingId] = useState<string | undefined>(route.params.cravingId);
  const craving = useCravingsStore(
    useCallback(state => (cravingId ? state.cravings.find(c => c.id === cravingId) : undefined), [cravingId]),
  );
  const cravings = useCravingsStore(state => state.cravings);
  const [now, setNow] = useState(() => Date.now());
  const [cuesOpen, setCuesOpen] = useState(false);
  const started = useRef(false);

  // Pick up an unfinished craving for this behaviour, or start a new one.
  useEffect(() => {
    if (started.current || cravingId) return;
    started.current = true;
    const { cravings: all, startCraving } = useCravingsStore.getState();
    const unfinished = all
      .filter(c => c.behaviorId === behaviorId && c.outcome == null)
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    setCravingId(unfinished?.id ?? startCraving(behaviorId));
  }, [behaviorId, cravingId]);

  const isOpen = craving != null && craving.outcome == null;
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!behavior || !craving) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <ScreenTitle style={styles.title}>{behavior ? 'Ride it out' : 'Behavior not found'}</ScreenTitle>
        </View>
      </SafeAreaView>
    );
  }

  const { rateUrge, setCravingCues, endCraving, discardCraving } = useCravingsStore.getState();
  const remainingMs = getRideRemainingMs(craving, now);
  const latestUrge = getLatestUrge(craving);
  const cues = craving.cues ?? [];

  const toggleCue = (ref: CueRef) =>
    setCravingCues(craving.id, cues.includes(ref) ? cues.filter(cue => cue !== ref) : [...cues, ref]);

  const handleGaveIn = () => {
    endCraving(craving.id, 'gaveIn');
    navigation.replace('BehaviorLog', { behaviorId, initialMode: 'log', initialCues: craving.cues });
  };

  const handleLogInstead = (alternativeId: string) => {
    endCraving(craving.id, 'redirected', alternativeId);
    navigation.replace('BehaviorLog', { behaviorId: alternativeId, initialMode: 'log', initialCues: craving.cues });
  };

  const handleTimeInstead = (alternativeId: string) => {
    endCraving(craving.id, 'redirected', alternativeId);
    useTimerStore.getState().start(alternativeId);
    navigation.replace('Timer');
  };

  const handleDiscard = () =>
    Alert.alert('Discard craving?', 'It will not be saved.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardCraving(craving.id);
          navigation.goBack();
        },
      },
    ]);

  if (craving.outcome != null) {
    const stats = getCravingWeekStats(cravings, Date.now(), behaviorId);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <ScreenTitle style={styles.title}>Ride it out</ScreenTitle>
        </View>
        <View style={styles.done}>
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={Colors.type.desirable}
          />
          <Text style={styles.doneTitle}>You rode it out</Text>
          <Text style={styles.doneText}>
            {behavior.name} cravings beaten this week: {stats.beaten}
            {stats.gaveIn ? ` · gave in ${stats.gaveIn}` : ''}
          </Text>
          <Button
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.doneButton}
          >
            Done
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.header}>
        <BackButton />
        <BehaviorIcon
          behavior={behavior}
          size={26}
        />
        <Text
          style={styles.headerName}
          numberOfLines={1}
        >
          {behavior.name}
        </Text>
        <Button
          variant="icon"
          onPress={handleDiscard}
          accessibilityLabel="Discard craving"
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={Colors.text.muted}
          />
        </Button>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <RideCountdown
          craving={craving}
          remainingMs={remainingMs}
        />

        <View style={styles.section}>
          <CueSectionLabel>{latestUrge == null ? 'How strong is the urge?' : "Right now it's…"}</CueSectionLabel>
          <UrgeScale
            value={latestUrge}
            onSelect={level => rateUrge(craving.id, level)}
          />
        </View>

        <View style={styles.section}>
          <Pressable
            style={styles.cuesToggle}
            onPress={() => setCuesOpen(open => !open)}
            accessibilityRole="button"
          >
            <CueSectionLabel>What set it off?{cues.length ? ` · ${cues.length}` : ''}</CueSectionLabel>
            <Ionicons
              name={cuesOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.text.faint}
            />
          </Pressable>
          {cuesOpen && (
            <CuePicker
              selected={cues}
              onToggle={toggleCue}
            />
          )}
        </View>

        <CravingAlternatives
          cravedBehaviorId={behaviorId}
          onLog={handleLogInstead}
          onTime={handleTimeInstead}
        />

        <View style={styles.actions}>
          <Button
            variant={remainingMs === 0 ? 'primary' : 'secondary'}
            onPress={() => endCraving(craving.id, 'resisted')}
            style={styles.action}
          >
            {remainingMs === 0 ? 'I rode it out' : "It's passed"}
          </Button>
          <Button
            variant="secondary"
            onPress={handleGaveIn}
            style={[styles.action, styles.gaveIn]}
          >
            <Text style={styles.gaveInText}>I gave in</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { flex: 1, fontSize: 22 },
  headerName: { flex: 1, color: Colors.text.primary, fontSize: 20, fontWeight: '700' },
  content: { gap: 18, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 9 },
  cuesToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  gaveIn: { borderWidth: 1, borderColor: Colors.typeBtn.undesirable },
  gaveInText: { color: Colors.typeText.undesirable, fontWeight: '700' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  doneTitle: { color: Colors.text.primary, fontSize: 24, fontWeight: '700' },
  doneText: { color: Colors.text.muted, fontSize: 14, textAlign: 'center' },
  doneButton: { alignSelf: 'stretch', marginTop: 12 },
});
