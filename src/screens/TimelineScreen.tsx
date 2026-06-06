import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BehaviorIcon } from '../components/BehaviorIcon';
import { CategoryBar } from '../components/CategoryBar';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry, LogEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import type { RecencyGroup } from '../utils/behaviorUtils';
import { GROUP_ORDER, getRecencyGroup } from '../utils/behaviorUtils';
import { formatCompactDate, formatTime, isOlderThanYesterday } from '../utils/timeUtils';

interface TimelineEntry {
  log: LogEntry;
  behavior: BehaviorEntry;
}

/** All logs that fall within the same calendar minute share one circle. */
interface MinuteGroup {
  minuteTimestamp: number;
  entries: TimelineEntry[];
  gapMs: number | null;
}

export function TimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviors, categories } = useBehaviorStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedCategoryId !== null && !categories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  const timelineEntries = useMemo(() => {
    const entries: TimelineEntry[] = [];

    const filteredBehaviors =
      selectedCategoryId === null
        ? behaviors
        : behaviors.filter(b => b.categoryId === selectedCategoryId);

    for (const behavior of filteredBehaviors) {
      for (const log of behavior.logs) {
        entries.push({ log, behavior });
      }
    }

    entries.sort((a, b) => b.log.timestamp - a.log.timestamp);
    return entries;
  }, [behaviors, selectedCategoryId]);

  // Group consecutive same-minute entries into one circle
  const minuteGroups = useMemo(() => {
    const groups: MinuteGroup[] = [];

    for (const entry of timelineEntries) {
      const minuteKey = Math.floor(entry.log.timestamp / 60000);
      const last = groups[groups.length - 1];
      const lastKey = last ? Math.floor(last.minuteTimestamp / 60000) : -1;

      if (last && lastKey === minuteKey) {
        last.entries.push(entry);
      } else {
        groups.push({ minuteTimestamp: entry.log.timestamp, entries: [entry], gapMs: null });
      }
    }

    // Compute gaps between groups
    for (let i = 0; i < groups.length; i++) {
      const next = groups[i + 1];
      if (next) {
        const thisOldest = groups[i].entries[groups[i].entries.length - 1].log.timestamp;
        const nextNewest = next.entries[0].log.timestamp;
        groups[i].gapMs = thisOldest - nextNewest;
      }
    }

    return groups;
  }, [timelineEntries]);

  // Group minute groups into recency sections
  const sections = useMemo(() => {
    const groups = new Map<RecencyGroup, MinuteGroup[]>();
    for (const group of GROUP_ORDER) groups.set(group, []);
    for (const mg of minuteGroups) {
      const group = getRecencyGroup(mg.minuteTimestamp);
      groups.get(group)!.push(mg);
    }
    return GROUP_ORDER.filter(g => (groups.get(g)?.length ?? 0) > 0).map(title => ({
      title,
      data: groups.get(title)!,
    }));
  }, [minuteGroups]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Timeline</Text>
      </View>

      <CategoryBar selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          <Text style={styles.empty}>
            {selectedCategoryId !== null
              ? 'No logs in this category yet.'
              : 'No logs yet.\nStart tracking a behavior to see your timeline.'}
          </Text>
        ) : (
          sections.map(section => (
            <View key={section.title}>
              <SectionHeader title={section.title} hideLine={section.title === 'Today'} />
              {section.data.map((group, index) => {
                const prevGroup = index > 0 ? section.data[index - 1] : null;
                const isFirstOfDay =
                  !prevGroup ||
                  !isSameCalendarDay(group.minuteTimestamp, prevGroup.minuteTimestamp);
                const showDate =
                  isOlderThanYesterday(group.minuteTimestamp) && isFirstOfDay;

                return (
                  <React.Fragment key={group.minuteTimestamp}>
                    <MinuteCircle
                      group={group}
                      isFirst={group === minuteGroups[0]}
                      isLast={group === minuteGroups[minuteGroups.length - 1]}
                      showDate={showDate}
                    />
                    {index < section.data.length - 1 &&
                      group.gapMs != null &&
                      group.gapMs >= 60_000 && (
                        <GapRow gapMs={group.gapMs} />
                      )}
                  </React.Fragment>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, hideLine }: { title: string; hideLine?: boolean }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.lineColumn}>
        <View style={[styles.lineSegment, hideLine && styles.lineHidden]} />
      </View>
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
    </View>
  );
}

interface MinuteCircleProps {
  group: MinuteGroup;
  isFirst: boolean;
  isLast: boolean;
  showDate?: boolean;
}

/** One circle on the timeline line representing all logs in a given minute. */
function MinuteCircle({ group, isFirst, isLast, showDate }: MinuteCircleProps) {
  return (
    <View style={styles.nodeContainer}>
      <View style={styles.lineColumn}>
        <View style={[styles.lineSegment, isFirst && styles.lineHidden]} />
        <View style={styles.circleOuter}>
          <View style={styles.circleInner} />
        </View>
        <View style={[styles.lineSegment, isLast && styles.lineHidden]} />
      </View>

      <View style={styles.contentColumn}>
        <Text style={styles.timeText}>
          {formatTime(group.minuteTimestamp)}
          {showDate && (
            <> · {formatCompactDate(group.minuteTimestamp)}</>
          )}
        </Text>

        {group.entries.map(entry => (
          <View key={entry.log.id} style={styles.behaviorRow}>
            <BehaviorIcon behavior={entry.behavior} size={18} />
            <Text style={styles.behaviorName} numberOfLines={1}>
              {entry.behavior.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function isSameCalendarDay(a: number, b: number): boolean {
  const dA = new Date(a);
  const dB = new Date(b);
  return (
    dA.getFullYear() === dB.getFullYear() &&
    dA.getMonth() === dB.getMonth() &&
    dA.getDate() === dB.getDate()
  );
}

/** Rotated gap text sitting on the timeline line between two minute circles. */
function GapRow({ gapMs }: { gapMs: number }) {
  return (
    <View style={styles.gapRow}>
      <View style={styles.gapLineColumn}>
        <View style={styles.gapLineSeg} />
        <Text style={styles.gapText}>{formatGap(gapMs)}</Text>
      </View>
      <View style={styles.gapSpacer} />
    </View>
  );
}

function formatGap(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

const LINE_COLOR = '#2a2a2a';
const CIRCLE_SIZE = 10;
const LINE_WIDTH = 2;
const GUTTER_WIDTH = 48;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    fontSize: 15,
    padding: 48,
  },

  // -- Section header --
  sectionHeaderRow: {
    flexDirection: 'row',
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 16,
    marginLeft: -12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  sectionHeaderText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 15,
  },

  // -- Minute group --
  nodeContainer: {
    flexDirection: 'row',
  },
  lineColumn: {
    width: GUTTER_WIDTH,
    alignItems: 'center',
  },
  lineSegment: {
    flex: 1,
    width: LINE_WIDTH,
    backgroundColor: LINE_COLOR,
  },
  lineHidden: {
    backgroundColor: 'transparent',
  },
  circleOuter: {
    width: CIRCLE_SIZE + 6,
    height: CIRCLE_SIZE + 6,
    borderRadius: (CIRCLE_SIZE + 6) / 2,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#555',
  },

  // -- Content --
  contentColumn: {
    flex: 1,
    paddingRight: 16,
    paddingVertical: 4,
    marginTop: -15,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  behaviorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  // -- Gap between minute groups --
  gapRow: {
    flexDirection: 'row',
    height: 32,
  },
  gapLineColumn: {
    width: GUTTER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLineSeg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: (GUTTER_WIDTH - LINE_WIDTH) / 2,
    width: LINE_WIDTH,
    backgroundColor: LINE_COLOR,
  },
  gapText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
    transform: [{ rotate: '90deg' }],
    marginRight: -16,
  },
  gapSpacer: {
    flex: 1,
  },
});
