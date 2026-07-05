import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { toDateString, yesterday } from '../../../utils/date-utils';
import { getTotalStarsForDate } from '../../../utils/star-utils';
import { Label } from '../../../utils/strings';
import { getTaskStarsForDate } from '../../../utils/task-utils';

interface SectionHeaderProps {
  title: string;
  behaviors: BehaviorEntry[];
  tasks: TaskEntry[];
}

export const SectionHeader = React.memo(function SectionHeader({ title, behaviors, tasks }: SectionHeaderProps) {
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const today = useMemo(() => toDateString(new Date(), dayCutoffHour), [dayCutoffHour]);
  const yesterdayStr = useMemo(() => toDateString(yesterday(new Date(), dayCutoffHour)), [dayCutoffHour]);
  const sectionDate = (() => {
    if (title === Label.TODAY) return today;
    if (title === Label.YESTERDAY) return yesterdayStr;
    return null;
  })();

  const sectionStars = useMemo(() => {
    if (!sectionDate) return null;
    const hasOptedIn = behaviors.some(b => b.starThresholds);
    const taskStars = getTaskStarsForDate(tasks, sectionDate);
    if (!hasOptedIn && taskStars === 0) return null;
    return getTotalStarsForDate(behaviors, sectionDate, dayCutoffHour) + taskStars;
  }, [behaviors, dayCutoffHour, tasks, sectionDate]);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {sectionStars !== null && (
          <View
            style={styles.sectionStarBadge}
            accessibilityLabel={`${sectionStars} stars on ${title.toLowerCase()}`}
          >
            <Ionicons
              name="star"
              size={12}
              color={Colors.star.filled}
            />
            <Text style={styles.sectionStarBadgeText}>{sectionStars}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.bg.input,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionStarBadgeText: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
