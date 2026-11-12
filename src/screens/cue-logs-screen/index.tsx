import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/app-icon';
import { BackButton } from '../../components/back-button';
import { Button } from '../../components/button';
import { CueTriggerIcon } from '../../components/cues/cue-trigger-icon';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useCustomCueOptions } from '../../hooks/use-custom-cue-options';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCuesStore } from '../../store/cues-store';
import { useSettingsStore } from '../../store/settings-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  type CueLogEntry,
  cueKindToTriggerType,
  getCueAccent,
  getCueLogDays,
  getCueSources,
} from '../../utils/cue-utils';
import { describeDay, formatDateDisplay } from '../../utils/date-utils';
import { DayLogCard } from '../day-screen/components/day-log-card';

type CueLogsRoute = RouteProp<RootStackParamList, 'CueLogs'>;

/** Every behaviour log tagged with one cue (a saved place, mood or body sensation), grouped by day. */
export function CueLogsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cueRef } = useRoute<CueLogsRoute>().params;
  const insets = useSafeAreaInsets();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const places = useCuesStore(state => state.places);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const custom = useCustomCueOptions();

  const source = useMemo(
    () => getCueSources(places, custom).find(item => item.ref === cueRef),
    [places, custom, cueRef],
  );
  const days = useMemo(() => getCueLogDays(behaviors, cueRef, dayCutoffHour), [behaviors, cueRef, dayCutoffHour]);
  const sections = useMemo(() => days.map(day => ({ ...day, data: day.entries })), [days]);
  const totalXp = days.reduce((sum, day) => sum + day.xp, 0);
  const logCount = days.reduce((sum, day) => sum + day.entries.length, 0);

  const kind = source?.kind ?? (cueRef.startsWith('place:') ? 'place' : cueRef.startsWith('mood:') ? 'mood' : 'body');
  const type = cueKindToTriggerType(kind);
  const accent = getCueAccent(type);
  const placeId = kind === 'place' ? cueRef.slice('place:'.length) : undefined;
  const placeExists = placeId != null && places.some(place => place.id === placeId);

  const handleEditLog = (behaviorId: string, logId: string) => {
    navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log', logId });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle style={styles.title}>{source?.label ?? 'Logs'}</ScreenTitle>
        {placeExists ? (
          <Button
            variant="icon"
            onPress={() => navigation.navigate('LocationEdit', { placeId })}
            accessibilityLabel="Edit place"
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={Colors.text.muted}
            />
          </Button>
        ) : (
          <View style={styles.trailingSpacer} />
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(entry: CueLogEntry) => `${entry.behavior.id}:${entry.log.id}`}
        stickySectionHeadersEnabled={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        ListHeaderComponent={
          <View style={styles.summary}>
            {source?.emoji ? (
              <View style={[styles.emojiIcon, { backgroundColor: `${accent}1f` }]}>
                <AppIcon
                  value={source.emoji}
                  style={styles.emoji}
                />
              </View>
            ) : (
              <CueTriggerIcon type={type} />
            )}
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryXp, totalXp > 0 && { color: accent }]}>{Math.round(totalXp)} XP</Text>
              <Text style={styles.summaryDetail}>
                {logCount === 0
                  ? 'No logs yet'
                  : `${logCount} ${logCount === 1 ? 'log' : 'logs'} over ${days.length} ${days.length === 1 ? 'day' : 'days'}`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No logs here yet</Text>
            <Text style={styles.emptyBody}>
              Pick this {kind === 'place' ? 'place' : 'cue'} on the log screen and the log will show up here.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>
              {describeDay(section.date, dayCutoffHour)}
              <Text style={styles.dayDate}> · {formatDateDisplay(section.date)}</Text>
            </Text>
            <Text style={styles.dayXp}>{Math.round(section.xp)} XP</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <DayLogCard
            entry={item}
            selectedDate={section.date}
            categories={categories}
            onEditLog={handleEditLog}
          />
        )}
        ItemSeparatorComponent={ItemGap}
      />
    </SafeAreaView>
  );
}

function ItemGap() {
  return <View style={styles.itemGap} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { flex: 1, fontSize: 24 },
  trailingSpacer: { width: 28 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
  },
  emojiIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 19 },
  summaryCopy: { flex: 1, gap: 2 },
  summaryXp: { color: Colors.text.faint, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryDetail: { color: Colors.text.faint, fontSize: 12 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 8,
  },
  dayLabel: { color: Colors.text.light, fontSize: 13, fontWeight: '700' },
  dayDate: { color: Colors.text.faint, fontSize: 12, fontWeight: '500' },
  dayXp: { color: Colors.text.faint, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  itemGap: { height: 10 },
  emptyCard: {
    gap: 5,
    marginTop: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 18,
  },
  emptyTitle: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  emptyBody: { color: Colors.text.faint, fontSize: 12, lineHeight: 18 },
});
