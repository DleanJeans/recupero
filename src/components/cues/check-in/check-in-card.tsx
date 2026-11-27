import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCheckIn } from '../../../hooks/use-check-in';
import { useCustomCueOptions } from '../../../hooks/use-custom-cue-options';
import { useCheckInStore } from '../../../store/checkin-store';
import { useCuesStore } from '../../../store/cues-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BodySensationId, MoodId } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { applyBodySensationsToNeeds, applyMoodsToNeeds } from '../../../utils/body-need-utils';
import { formatCheckInAgo, getCheckInDays, getNextCheckInXp, isCheckInStale } from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { getBodySensationOption, getMoodOption } from '../../../utils/cue-utils';
import { Text } from '../../text';
import { CheckInSheet, type CheckInSheetKind } from './check-in-sheet';
import { CheckInSquare } from './check-in-square';
import { CheckInWeekStrip } from './check-in-week-strip';

const UNDO_VISIBLE_MS = 6000;
const STREAK_ACCENT = '#fb923c';

interface JustLogged {
  kind: CheckInSheetKind;
  ids: string[];
  label: string;
  xp: number;
}

/** "Right now" card atop the Cues tab: current mood and body squares, the check-in streak and level. */
export function CheckInCard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checkIn = useCheckIn();
  const custom = useCustomCueOptions();
  const staleHours = useCheckInStore(state => state.staleHours);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const logMoods = useCuesStore(state => state.logMoods);
  const logBodySensations = useCuesStore(state => state.logBodySensations);
  const removeMoodLog = useCuesStore(state => state.removeMoodLog);
  const removeBodyLog = useCuesStore(state => state.removeBodyLog);
  const [sheet, setSheet] = useState<CheckInSheetKind>();
  const [justLogged, setJustLogged] = useState<JustLogged>();
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const now = Date.now();

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const days = useMemo(
    () => getCheckInDays(checkIn.events, 7, Date.now(), dayCutoffHour),
    [checkIn.events, dayCutoffHour],
  );
  const { streak, level, lastMood, lastBody, lastMoodExtra, lastBodyExtra } = checkIn;

  const showUndo = (entry: JustLogged) => {
    setJustLogged(entry);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setJustLogged(undefined), UNDO_VISIBLE_MS);
  };

  const joinLabels = (labels: string[]) =>
    labels.length > 2 ? `${labels[0]}, ${labels[1]} +${labels.length - 2}` : labels.join(', ');

  const logPickedMoods = (moods: MoodId[]) => {
    if (moods.length === 0) return;
    const xp = getNextCheckInXp(checkIn.events, 'mood', Date.now(), dayCutoffHour);
    const ids = logMoods(moods);
    applyMoodsToNeeds(moods);
    setSheet(undefined);
    showUndo({ kind: 'mood', ids, label: joinLabels(moods.map(m => getMoodOption(m, custom.moods).label)), xp });
  };

  const logPickedSensations = (sensations: BodySensationId[], ts?: number) => {
    if (sensations.length === 0) return;
    const xp = getNextCheckInXp(checkIn.events, 'body', Date.now(), dayCutoffHour);
    const ids = logBodySensations(sensations, ts);
    applyBodySensationsToNeeds(sensations);
    setSheet(undefined);
    showUndo({
      kind: 'body',
      ids,
      label: joinLabels(sensations.map(s => getBodySensationOption(s, custom.sensations).label)),
      xp,
    });
  };

  const undo = () => {
    if (!justLogged) return;
    for (const id of justLogged.ids) {
      if (justLogged.kind === 'mood') removeMoodLog(id);
      else removeBodyLog(id);
    }
    clearTimeout(undoTimer.current);
    setJustLogged(undefined);
  };

  const moodOption = lastMood ? getMoodOption(lastMood.mood, custom.moods) : undefined;
  const bodyOption = lastBody ? getBodySensationOption(lastBody.sensation, custom.sensations) : undefined;
  const moodStale = isCheckInStale(lastMood?.ts, staleHours, now);
  const bodyStale = isCheckInStale(lastBody?.ts, staleHours, now);
  const moodJustLogged = justLogged?.kind === 'mood' ? justLogged.xp : undefined;
  const bodyJustLogged = justLogged?.kind === 'body' ? justLogged.xp : undefined;

  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <Text style={styles.label}>Right now</Text>
        <Text style={styles.hint}>tap to log</Text>
      </View>

      {streak.atRisk && (
        <View style={styles.risk}>
          <Text style={styles.riskText}>🔥 Check in today to keep your {streak.current}-day streak</Text>
        </View>
      )}

      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.top, pressed && styles.pressed]}
          onPress={() => navigation.navigate('CheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Check-in streak and level"
        >
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>🔥 {streak.current}</Text>
          </View>
          <Text style={styles.streakLabel}>day streak</Text>
          <Text style={styles.level}>
            Check-in <Text style={styles.levelValue}>Lv {level.level}</Text> · {Math.floor(checkIn.xp)} XP ›
          </Text>
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>

        <View style={styles.squares}>
          <CheckInSquare
            tag="MOOD"
            emoji={moodOption?.emoji}
            title={
              moodOption ? `${moodOption.label}${lastMoodExtra > 0 ? ` +${lastMoodExtra}` : ''}` : 'How do you feel?'
            }
            caption={
              moodStale && lastMood
                ? `${formatCheckInAgo(lastMood.ts, now)} · still true?`
                : formatCheckInAgo(lastMood?.ts, now)
            }
            stale={moodStale}
            gain={moodJustLogged}
            onPress={() => setSheet('mood')}
          />
          <CheckInSquare
            tag="BODY"
            emoji={bodyOption?.emoji}
            title={
              bodyOption
                ? `${bodyOption.label}${lastBodyExtra > 0 ? ` +${lastBodyExtra}` : ''}`
                : 'What does your body say?'
            }
            caption={
              bodyStale && lastBody
                ? `${formatCheckInAgo(lastBody.ts, now)} · still true?`
                : formatCheckInAgo(lastBody?.ts, now)
            }
            stale={bodyStale}
            gain={bodyJustLogged}
            onPress={() => setSheet('body')}
          />
        </View>

        <CheckInWeekStrip days={days} />

        {justLogged && (
          <View style={styles.undoBar}>
            <Text
              style={styles.undoText}
              numberOfLines={1}
            >
              {justLogged.label} logged
              {justLogged.xp > 0 ? ` · +${justLogged.xp} XP` : ''}
              {streak.current > 0 ? ` · 🔥 ${streak.current}-day streak` : ''}
            </Text>
            <Pressable
              onPress={undo}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.undoAction}>Undo</Text>
            </Pressable>
          </View>
        )}
      </View>

      {sheet && (
        <CheckInSheet
          kind={sheet}
          xp={getNextCheckInXp(checkIn.events, sheet, now, dayCutoffHour)}
          onLogMoods={logPickedMoods}
          onLogSensations={logPickedSensations}
          onClose={() => setSheet(undefined)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 },
  label: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingTop: 8,
  },
  hint: { color: Colors.text.muted, fontSize: 11 },
  risk: {
    backgroundColor: '#2a1a0e',
    borderWidth: 1,
    borderColor: '#7c3a12',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  riskText: { color: '#fdba74', fontSize: 12 },
  card: {
    backgroundColor: Colors.bg.darker,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 11,
    gap: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pressed: { opacity: 0.72 },
  streakPill: { backgroundColor: '#3a2410', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  streakText: { color: STREAK_ACCENT, fontSize: 12, fontWeight: '800' },
  streakLabel: { color: Colors.text.secondary, fontSize: 12 },
  level: { marginLeft: 'auto', color: Colors.text.light, fontSize: 11 },
  levelValue: { color: Colors.star.filled, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.bg.input, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: Colors.star.filled },
  squares: { flexDirection: 'row', gap: 8, marginTop: 4 },
  undoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  undoText: { flex: 1, color: Colors.text.secondary, fontSize: 12 },
  undoAction: { color: Colors.type.desirable, fontSize: 12, fontWeight: '700' },
});
