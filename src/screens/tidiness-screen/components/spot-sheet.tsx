import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/app-icon';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useTidinessStore } from '../../../store/tidiness-store';
import { useTimerStore } from '../../../store/timer-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import {
  formatMessyIn,
  formatTidyPercent,
  getSpotEvents,
  getTidyColor,
  TIDY_CHECK_IN_LEVELS,
  TIDY_WEIGHT_LABELS,
  type TidyEvent,
  type TidySpotState,
} from '../../../utils/tidiness-utils';
import { formatCompactDate, formatTime } from '../../../utils/time-utils';
import { TidyBar } from './tidy-bar';
import { TidyChip } from './tidy-chip';

const RECENT_COUNT = 6;

interface SpotSheetProps {
  state: TidySpotState;
  roomName: string;
  onEdit: () => void;
  onClose: () => void;
}

function describeEvent(event: TidyEvent, nameOf: (id: string) => string | undefined): string {
  if (event.behaviorId) return nameOf(event.behaviorId) ?? 'Cleaned';
  if (!event.checkIn) return 'Marked clean';
  const label = TIDY_CHECK_IN_LEVELS.find(item => item.level === event.level)?.label;
  return `Checked: ${label ?? `${Math.round(event.level)}%`}`;
}

/** One spot: level, how fast it gets messy, what cleans it (Log / Timer), a check-in and recent cleans. */
export function SpotSheet({ state, roomName, onEdit, onClose }: SpotSheetProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const behaviors = useBehaviorStore(store => store.behaviors);
  const marks = useTidinessStore(store => store.marks);
  const markClean = useTidinessStore(store => store.markClean);
  const checkInSpot = useTidinessStore(store => store.checkInSpot);
  const removeMark = useTidinessStore(store => store.removeMark);
  const startTimer = useTimerStore(store => store.start);
  const { spot, level } = state;
  const linked = spot.behaviorIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter((behavior): behavior is BehaviorEntry => behavior != null && behavior.archivedAt == null);
  const recent = useMemo(() => getSpotEvents(spot, marks, behaviors).slice(0, RECENT_COUNT), [spot, marks, behaviors]);
  const nameOf = (id: string) => behaviors.find(behavior => behavior.id === id)?.name;

  const log = (behaviorId: string) => {
    onClose();
    navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log' });
  };
  const time = (behaviorId: string) => {
    onClose();
    startTimer(behaviorId, Date.now());
    navigation.navigate('Timer');
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grab} />
          <View style={styles.header}>
            <AppIcon
              value={spot.emoji}
              size={26}
              fallback="🧹"
            />
            <View style={styles.headerText}>
              <Text
                style={styles.title}
                numberOfLines={1}
              >
                {roomName} · {spot.name}
              </Text>
              <Text
                style={styles.sub}
                numberOfLines={1}
              >
                Messy in {formatMessyIn(spot.emptyHours)}
                {spot.learnedFrom > 0
                  ? ` (learned from ${spot.learnedFrom} check-in${spot.learnedFrom === 1 ? '' : 's'})`
                  : ''}
              </Text>
            </View>
            <Text
              style={[styles.level, { color: getTidyColor(level) }]}
              numberOfLines={1}
            >
              {formatTidyPercent(level)}
            </Text>
          </View>
          <TidyBar
            level={level}
            height={10}
            showLine
          />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.label}>CLEAN IT</Text>
            {linked.map(behavior => (
              <View
                key={behavior.id}
                style={styles.behaviorRow}
              >
                <BehaviorIcon
                  behavior={behavior}
                  size={20}
                />
                <Text
                  style={styles.behaviorName}
                  numberOfLines={1}
                >
                  {behavior.name}
                </Text>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => log(behavior.id)}
                >
                  Log
                </Button>
                <Button
                  size="sm"
                  onPress={() => time(behavior.id)}
                  accessibilityLabel={`Start a timer for ${behavior.name}`}
                >
                  <Ionicons
                    name="stopwatch-outline"
                    size={16}
                    color={Colors.text.primary}
                  />
                </Button>
              </View>
            ))}
            <View style={styles.cleanRow}>
              <Button
                variant={linked.length === 0 ? 'primary' : 'secondary'}
                onPress={() => markClean(spot.id)}
                style={styles.cleanButton}
              >
                ✓ Mark clean now
              </Button>
            </View>
            {linked.length === 0 && (
              <Text style={styles.hint}>Link a cleaning behaviour in Edit to log it or time it from here.</Text>
            )}
            <Text style={styles.label}>HOW IS IT NOW?</Text>
            <View style={styles.chips}>
              {TIDY_CHECK_IN_LEVELS.map(item => (
                <TidyChip
                  key={item.label}
                  label={`${item.emoji} ${item.label}`}
                  onPress={() => checkInSpot(spot.id, item.level)}
                />
              ))}
            </View>
            <Text style={styles.hint}>A check-in sets the level and teaches how fast this spot gets messy.</Text>
            <Text style={styles.label}>RECENT</Text>
            {recent.length === 0 && <Text style={styles.hint}>Nothing yet.</Text>}
            {recent.map(event => (
              <View
                key={event.markId ?? event.logId ?? String(event.ts)}
                style={styles.recentRow}
              >
                <Text
                  style={styles.recentWhen}
                  numberOfLines={1}
                >
                  {formatCompactDate(event.ts)} {formatTime(event.ts)}
                </Text>
                <Text
                  style={styles.recentWhat}
                  numberOfLines={1}
                >
                  {describeEvent(event, nameOf)}
                </Text>
                {event.markId ? (
                  <Pressable
                    onPress={() => event.markId && removeMark(event.markId)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove"
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={Colors.text.faint}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={styles.footer}>
              <Text
                style={styles.hint}
                numberOfLines={1}
              >
                Weight: {TIDY_WEIGHT_LABELS[spot.weight]}
              </Text>
              <Button
                size="sm"
                onPress={onEdit}
              >
                Edit spot
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    maxHeight: '88%',
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border.dim },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: Colors.text.primary, fontSize: 18, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: 12 },
  level: { minWidth: 52, flexShrink: 0, textAlign: 'right', fontSize: 22, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 8, paddingBottom: 8 },
  label: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.primary,
    borderRadius: 12,
    padding: 8,
  },
  behaviorName: { flex: 1, color: Colors.text.secondary, fontSize: 14 },
  cleanRow: { flexDirection: 'row' },
  cleanButton: { flex: 1 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.input,
  },
  recentWhen: { minWidth: 110, flexShrink: 0, color: Colors.text.muted, fontSize: 13 },
  recentWhat: { flex: 1, color: Colors.text.secondary, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
});
